import os
import pydicom
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
import cv2
import numpy as np

from processors.blur_detector import BlurDetector
from processors.contrast_analyzer import ContrastAnalyzer
from processors.motion_detector import MotionDetector
from processors.body_part_validator import BodyPartValidator

# Configure path resolution
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "c:/Users/Admin/Documents/GitHub/Radiology-Project/backend")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(title="Radiology AI Integrity Service")

# Initialize modular processors
# Initialize modular processors
blur_detector = BlurDetector(threshold=80.0)
contrast_analyzer = ContrastAnalyzer(arterial_threshold=120)
body_part_validator = BodyPartValidator()

# Initialize with default configs
motion_detector_mri = MotionDetector(sensitivity=0.8, modality='MRI')
motion_detector_ct = MotionDetector(sensitivity=0.8, modality='CT')
motion_detector_xr = MotionDetector(sensitivity=0.7, modality='CR')

# Configure CORS
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




class ValidationRequest(BaseModel):
    caseId: str
    filePaths: List[str]
    modality: str
    bodyPart: Optional[str] = "Unknown"
    callbackUrl: str

class ValidationResult(BaseModel):
    level: str
    type: str
    message: str
    seriesInstanceUID: Optional[str] = None
    details: Optional[dict] = None

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
@limiter.limit("5/minute")
async def health_check(request: Request):
    return {"status": "ok", "service": "ai-integrity-service"}


@app.post("/analyze")
@limiter.limit("10/minute")
async def start_analysis(validation_request: ValidationRequest, background_tasks: BackgroundTasks, request: Request):
    """
    Triggers an asynchronous pixel-level analysis of a study.
    """
    background_tasks.add_task(process_study, validation_request)
    return {"status": "Processing", "message": f"Analysis started for case {validation_request.caseId}"}

from fastapi.responses import FileResponse

@app.get("/thumbnail/{case_id}/{filename}")
async def get_thumbnail(case_id: str, filename: str):
    # Path Resolution
    # DICOM inputs are at: uploads/cases/{case_id}/dicom/{filename}
    # Previews are at: uploads/cases/{case_id}/previews/{filename}.jpg
    
    # We strip .dcm or .jpg from filename input just in case, assume base is dcm filename without extension or with
    base_name = filename
    if filename.lower().endswith('.jpg'):
        base_name = filename[:-4]
    elif filename.lower().endswith('.dcm'):
        base_name = filename
    
    # Construct paths
    # Note: UPLOAD_DIR is usually project root/backend
    # Cases path structure: backend/uploads/cases/{case_id}/dicom/{base_name}
    
    dcm_rel_path = f"uploads/cases/{case_id}/dicom/{base_name}"
    preview_rel_path = f"uploads/cases/{case_id}/previews/{base_name}.jpg"
    
    dcm_abs_path = os.path.join(UPLOAD_DIR, dcm_rel_path).replace("\\", "/")
    preview_abs_path = os.path.join(UPLOAD_DIR, preview_rel_path).replace("\\", "/")
    
    # 1. Check if preview already exists
    if os.path.exists(preview_abs_path):
        return FileResponse(preview_abs_path)
        
    # 2. Check if DICOM exists to generate from
    if not os.path.exists(dcm_abs_path):
        # Try appending .dcm if missing
        if not dcm_abs_path.lower().endswith('.dcm'):
             dcm_abs_path += ".dcm"
        
        if not os.path.exists(dcm_abs_path):
            raise HTTPException(status_code=404, detail=f"DICOM file not found: {dcm_rel_path}")

    # 3. Generate on the fly
    try:
        ds = pydicom.dcmread(dcm_abs_path)
        pixels = ds.pixel_array
        
        # Normalize to 8-bit
        if pixels.ndim == 2:
            img = cv2.normalize(pixels, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        elif pixels.ndim == 3:
             # Take middle frame or first frame
             mid = pixels.shape[0] // 2
             img = cv2.normalize(pixels[mid], None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        else:
             raise ValueError("Unsupported pixel data dimensions")
             
        # Save
        os.makedirs(os.path.dirname(preview_abs_path), exist_ok=True)
        cv2.imwrite(preview_abs_path, img)
        
        return FileResponse(preview_abs_path)
        
    except Exception as e:
        logger.error(f"Thumbnail generation error: {str(e)}")
        # Return a placeholder or 500? Use 404 image for now or just error
        raise HTTPException(status_code=500, detail="Failed to generate thumbnail")

def save_evidence_thumbnail(pixel_array: np.ndarray, rel_path: str):
    """
    Generates a JPEG thumbnail from the DICOM pixel array for visual proof.
    """
    try:
        # Normalize to 0-255 for JPEG
        img = cv2.normalize(pixel_array, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        # Path structure: uploads/cases/<caseId>/dicom/<fileName>
        path_norm = rel_path.replace("\\", "/")
        parts = path_norm.split("/")
        
        if "cases" in parts:
            case_idx = parts.index("cases")
            case_id = parts[case_idx + 1]
            filename = os.path.basename(path_norm).split(".")[0] + ".jpg"
            
            # Create previews directory
            preview_rel_dir = f"uploads/cases/{case_id}/previews"
            preview_abs_dir = os.path.join(UPLOAD_DIR, preview_rel_dir)
            os.makedirs(preview_abs_dir, exist_ok=True)
            
            preview_abs_path = os.path.join(preview_abs_dir, filename)
            cv2.imwrite(preview_abs_path, img)
            
            # Return web-accessible path
            return f"/{preview_rel_dir}/{filename}"
        return None
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {str(e)}")
        return None

async def process_study(request: ValidationRequest):
    findings = []
    logger.info(f"Processing case {request.caseId} with {len(request.filePaths)} files")

    try:
        # 🔥 IMPROVED SAMPLING STRATEGY
        # Instead of just first 10, sample strategically:
        sample_paths = _smart_sample_files(request.filePaths, request.modality)
        
        # Select appropriate detector
        if request.modality == 'MRI':
            motion_detector = motion_detector_mri
        elif request.modality == 'CT':
            motion_detector = motion_detector_ct
        else:
            motion_detector = motion_detector_xr

        for path in sample_paths:
            # Note: Path is relative (e.g. /uploads/cases/...)
            full_path = os.path.join(UPLOAD_DIR, path.lstrip("/")) 
            
            if not os.path.exists(full_path):
                logger.error(f"File not found: {full_path}")
                continue

            try:
                ds = pydicom.dcmread(full_path)
                pixels = ds.pixel_array

                # 1. Blur Detection
                blur_res = blur_detector.analyze(
                    pixels, 
                    modality=ds.Modality if hasattr(ds, 'Modality') else request.modality
                )
                if blur_res["status"] == "Warning":
                    preview_url = save_evidence_thumbnail(pixels, path)
                    findings.append(ValidationResult(
                        level="AI",
                        type="Warning",
                        message=f"{blur_res['message']} detected",
                        seriesInstanceUID=ds.SeriesInstanceUID,
                        details={
                            "problematicFrames": [{
                                "path": path,
                                "name": os.path.basename(path),
                                "series": ds.SeriesDescription if hasattr(ds, 'SeriesDescription') else 'N/A',
                                "previewUrl": preview_url,
                                "score": blur_res.get("score"),
                                "severity": blur_res.get("severity", "moderate")
                            }],
                            "totalProblematic": 1,
                            "algorithmDetails": blur_res.get("details", {})
                        }
                    ))

                # 2. Motion Detection
                motion_res = motion_detector.analyze(
                    pixels,
                    modality=ds.Modality if hasattr(ds, 'Modality') else request.modality
                )

                # Only report moderate/severe motion
                if motion_res["status"] == "Warning" and motion_res.get("severity") in ["moderate", "severe"]:
                    preview_url = save_evidence_thumbnail(pixels, path)
                    findings.append(ValidationResult(
                        level="AI",
                        type="Warning",
                        message=motion_res["message"],
                        seriesInstanceUID=ds.SeriesInstanceUID,
                        details={
                            "problematicFrames": [{
                                "path": path,
                                "name": os.path.basename(path),
                                "series": ds.SeriesDescription if hasattr(ds, 'SeriesDescription') else 'N/A',
                                "previewUrl": preview_url,
                                "score": motion_res["score"],
                                "severity": motion_res.get("severity", "moderate"),
                                "confidence": motion_res.get("confidence", 0.0)
                            }],
                            "totalProblematic": 1,
                            "algorithmDetails": motion_res.get("details", {})
                        }
                    ))

                # 3. Body Part Validation (Sample once)
                if path == sample_paths[0] and request.bodyPart:
                    body_res = body_part_validator.validate(request.bodyPart, ds, pixels=pixels)
                    if body_res["status"] == "Warning":
                        findings.append(ValidationResult(
                            level="AI",
                            type="Warning",
                            message=body_res["message"],
                            seriesInstanceUID=ds.SeriesInstanceUID,
                            details={
                                "problematicFrames": [{
                                    "path": path,
                                    "name": os.path.basename(path),
                                    "series": ds.SeriesDescription if hasattr(ds, 'SeriesDescription') else 'N/A',
                                    "severity": body_res.get("severity", "moderate")
                                }],
                                "totalProblematic": 1,
                                **body_res.get("details", {})
                            }
                        ))

                # 4. Contrast Analysis
                if request.modality in ["CT", "MRI"]:
                    # Pass DICOM scaling attributes for CT
                    dicom_meta = {
                        "rescale_slope": getattr(ds, 'RescaleSlope', 1.0),
                        "rescale_intercept": getattr(ds, 'RescaleIntercept', 0.0)
                    }
                    
                    contrast_res = contrast_analyzer.analyze(
                        pixels, 
                        request.modality,
                        dicom_meta=dicom_meta
                    )
                    
                    # Update findings for any contrast results
                    # (Usually Pass/Info unless we add clinical correlation logic)
                    if contrast_res["status"] != "Error":
                        findings.append(ValidationResult(
                            level="AI",
                            type="Info" if contrast_res["status"] == "Pass" else contrast_res["status"],
                            message=contrast_res["message"],
                            seriesInstanceUID=ds.SeriesInstanceUID,
                            details={
                                "problematicFrames": [{
                                    "path": path,
                                    "name": os.path.basename(path),
                                    "series": ds.SeriesDescription if hasattr(ds, 'SeriesDescription') else 'N/A',
                                    "modality": request.modality
                                }],
                                "totalProblematic": 0 if contrast_res["status"] == "Pass" else 1,
                                "analysis": contrast_res.get("details", {})
                            }
                        ))
            
            except Exception as e:
                logger.error(f"Failed to process file {path}: {str(e)}")
                findings.append(ValidationResult(
                    level="AI",
                    type="Error",
                    message=f"Corrupt/Invalid DICOM: {str(e)}",
                    details={"path": path}
                ))

        # Callback to Node.js backend
        async with httpx.AsyncClient() as client:
            await client.post(request.callbackUrl, json={
                "caseId": request.caseId,
                "findings": [f.dict() for f in findings],
                "aiScore": _calculate_ai_score(findings)  # Improved scoring
            })
            logger.info(f"Callback sent for case {request.caseId}")

    except Exception as e:
        logger.error(f"Error processing study: {str(e)}")


def _smart_sample_files(file_paths: List[str], modality: str) -> List[str]:
    """
    Smart sampling strategy: take beginning, middle, end + some random.
    Motion artifacts often occur mid-scan when patient gets uncomfortable.
    """
    n = len(file_paths)
    
    if n <= 10:
        return file_paths
    
    # For large studies, sample strategically
    samples = []
    
    # First 2 (baseline)
    samples.extend(file_paths[:2])
    
    # Middle 3 (where motion often occurs)
    mid_start = n // 2 - 1
    samples.extend(file_paths[mid_start:mid_start + 3])
    
    # Last 2
    samples.extend(file_paths[-2:])
    
    # Random 3 from remainder
    remaining = [p for p in file_paths if p not in samples]
    if len(remaining) > 3:
        import random
        samples.extend(random.sample(remaining, 3))
    else:
        samples.extend(remaining)
    
    return samples[:10]  # Cap at 10


def _calculate_ai_score(findings: List[ValidationResult]) -> int:
    """
    Improved AI quality score based on severity and confidence.
    """
    if not findings:
        return 100
    
    # Weight by severity
    severity_weights = {'mild': 5, 'moderate': 15, 'severe': 30}
    
    total_deduction = 0
    for finding in findings:
        # Default to moderate if not specified
        severity = 'moderate'
        if finding.details and isinstance(finding.details, dict):
             # Check algorithmDetails first, then finding details
             algo_details = finding.details.get('algorithmDetails', {})
             if algo_details and 'severity' in algo_details:
                 severity = algo_details['severity']
             elif 'severity' in finding.details:
                 severity = finding.details['severity']
             # Check problematic frames
             elif 'problematicFrames' in finding.details:
                 frames = finding.details['problematicFrames']
                 if frames and 'severity' in frames[0]:
                     severity = frames[0]['severity']
        
        deduction = severity_weights.get(severity, 15)
        
        # Reduce deduction if confidence is low
        confidence = 1.0
        if finding.details and 'problematicFrames' in finding.details:
             frames = finding.details['problematicFrames']
             if frames and 'confidence' in frames[0]:
                 confidence = frames[0]['confidence']
        
        total_deduction += deduction * confidence
    
    return max(0, 100 - int(total_deduction))

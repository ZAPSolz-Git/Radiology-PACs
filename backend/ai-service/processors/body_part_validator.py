import logging
import numpy as np
import cv2
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

class BodyPartValidator:
    """
    Enhanced body part validator with multi-tag matching and geometric validation.
    
    Validates that the scanned anatomy matches the requested body part by:
    1. Cross-referencing multiple DICOM tags with comprehensive synonyms
    2. Performing geometric sanity checks (aspect ratio, FOV size)
    3. Optional pixel-based validation for specific modalities
    
    Usage:
        validator = BodyPartValidator()
        result = validator.validate('CHEST', dicom_dataset, pixels=pixel_array)
        
        if result['status'] == 'Warning':
            print(f"Mismatch: {result['message']}")
    """

    # Comprehensive medical terminology mappings
    MAPPINGS = {
        'BRAIN': ['HEAD', 'NCCT HEAD', 'MRI BRAIN', 'SKULL', 'CEREBRAL', 'CT HEAD', 'CRANIUM', 'INTRACRANIAL'],
        'HEAD': ['BRAIN', 'SKULL', 'CEREBRAL', 'NCCT HEAD', 'MRI BRAIN', 'CT HEAD', 'CRANIUM'],
        'CHEST': ['THORAX', 'LUNGS', 'RIB CAGE', 'CXA', 'CXR', 'HEART', 'PLEURA', 'PULMONARY', 'THORACIC'],
        'ABDOMEN': ['ABD', 'KUB', 'STOMACH', 'LIVER', 'RENAL', 'ABDOMEN/PELVIS', 'PANCREAS', 'ABDOMINAL'],
        'PELVIS': ['HIP', 'SI JOINTS', 'PELVIC', 'HIP/PELVIS', 'SYMPHYSIS', 'SACRUM', 'ILIAC'],
        'NECK': ['CERVICAL', 'C-SPINE', 'SOFT TISSUE NECK', 'THYROID', 'CERVICAL SPINE'],
        'KNEE': ['KNEE', 'LOWER LIMB', 'LEG', 'PATELLA', 'TIBIOFEMORAL'],
        'SHOULDER': ['SHOULDER', 'UPPER LIMB', 'ARM', 'CLAVICLE', 'SCAPULA', 'GLENOHUMERAL'],
        'FOOT': ['ANKLE', 'PEDIS', 'METATARSAL', 'CALCANEUS', 'HINDFOOT', 'FOREFOOT'],
        'HAND': ['WRIST', 'MANUS', 'METACARPAL', 'CARPAL', 'PHALANGES'],
        'SPINE': ['VERTEBRA', 'C-SPINE', 'T-SPINE', 'L-SPINE', 'NECK', 'BACK', 'SPINAL'],
        'LUMBAR SPINE': ['L-SPINE', 'LUMBAR', 'LUMBO-SACRAL', 'BACK', 'LS SPINE'],
        'CERVICAL SPINE': ['C-SPINE', 'NECK', 'CERVICAL', 'CS SPINE'],
        'THORACIC SPINE': ['T-SPINE', 'THORACIC', 'D-SPINE', 'TS SPINE', 'DORSAL SPINE'],
        'ELBOW': ['ELBOW', 'HUMERAL', 'RADIAL', 'ULNAR'],
        'WRIST': ['WRIST', 'CARPAL', 'DISTAL FOREARM'],
        'ANKLE': ['ANKLE', 'TIBIOTALAR', 'DISTAL LEG'],
        'FEMUR': ['THIGH', 'FEMORAL', 'UPPER LEG'],
        'TIBIA': ['LOWER LEG', 'TIBIAL', 'CALF', 'SHIN'],
        'HUMERUS': ['UPPER ARM', 'HUMERAL'],
    }

    def validate(self, requested_part: str, dicom_data, pixels: np.ndarray = None) -> Dict:
        """
        Validate body part match between request and DICOM data.
        
        Args:
            requested_part: User-requested body part name
            dicom_data: PyDICOM dataset object
            pixels: Optional pixel array for geometric validation
            
        Returns:
            Dictionary with keys:
                - status: 'Pass', 'Warning', or 'Error'
                - severity: 'none', 'mild', 'moderate', or 'severe'
                - message: Human-readable description
                - details: Detailed information about tags and checks
        """
        try:
            requested_upper = str(requested_part).upper().strip()
            
            # Step 1: Collect all relevant DICOM tags
            tags = self._collect_dicom_tags(dicom_data)
            
            # Step 2: Text-based validation (primary method)
            text_match, best_tag = self._validate_text_tags(requested_upper, tags)
            
            # Step 3: Geometric validation (if pixels provided and X-Ray modality)
            geo_match = True
            geo_details = {}
            
            if pixels is not None and hasattr(dicom_data, 'Modality') and dicom_data.Modality in ['CR', 'DX']:
                geo_match, geo_details = self._validate_geometry(pixels, requested_upper)
            
            # Step 4: Combine results and determine final status
            return self._generate_result(
                requested_part=requested_part,
                text_match=text_match,
                geo_match=geo_match,
                best_tag=best_tag,
                tags=tags,
                geo_details=geo_details
            )
            
        except Exception as e:
            logger.error(f"Body part validation error: {str(e)}", exc_info=True)
            return {
                "status": "Error",
                "severity": "none",
                "message": f"Body part validation failed: {str(e)}",
                "details": {"error": str(e)}
            }

    def _collect_dicom_tags(self, dicom_data) -> Dict[str, str]:
        """
        Extract all relevant DICOM tags for body part matching.
        
        Args:
            dicom_data: PyDICOM dataset
            
        Returns:
            Dictionary of tag names to uppercase string values
        """
        tags = {}
        
        # Standard DICOM tags for body part identification
        tag_names = [
            'BodyPartExamined',
            'ProtocolName',
            'StudyDescription',
            'SeriesDescription',
            'ProcedureCodeSequence',
            'AnatomicRegionSequence'
        ]
        
        for tag_name in tag_names:
            try:
                value = getattr(dicom_data, tag_name, '')
                if value:
                    tags[tag_name] = str(value).upper().strip()
                else:
                    tags[tag_name] = ''
            except Exception as e:
                logger.debug(f"Could not read tag {tag_name}: {e}")
                tags[tag_name] = ''
        
        return tags

    def _validate_text_tags(self, requested_part: str, tags: Dict[str, str]) -> Tuple[bool, str]:
        """
        Validate body part using text matching against DICOM tags.
        
        Args:
            requested_part: Requested body part (uppercase)
            tags: Dictionary of DICOM tag values
            
        Returns:
            Tuple of (match_found, best_matching_tag)
        """
        # Build list of valid terms (requested part + all synonyms)
        valid_terms = [requested_part]
        if requested_part in self.MAPPINGS:
            valid_terms.extend(self.MAPPINGS[requested_part])
        
        # Filter out empty terms
        valid_terms = [term for term in valid_terms if term]
        
        # Check each DICOM tag for matches
        for tag_name, tag_value in tags.items():
            if not tag_value:
                continue
            
            # Check for any valid term in the tag value
            for term in valid_terms:
                if term in tag_value:
                    match_info = f"{tag_name} ('{tag_value}')"
                    logger.info(f"Body part match found: {term} in {match_info}")
                    return True, match_info
        
        # No match found
        logger.warning(f"No match found for '{requested_part}' in DICOM tags")
        return False, None

    def _validate_geometry(self, pixels: np.ndarray, requested_part: str) -> Tuple[bool, Dict]:
        """
        Validate body part using geometric properties (aspect ratio, size).
        
        This is a heuristic check for X-Ray images where FOV and orientation
        can provide clues about the anatomy.
        
        Args:
            pixels: 2D pixel array
            requested_part: Requested body part (uppercase)
            
        Returns:
            Tuple of (is_valid, details_dict)
        """
        # Handle multi-dimensional arrays
        if pixels.ndim > 2:
            pixels = pixels[0] if pixels.ndim == 3 else pixels.squeeze()
        
        rows, cols = pixels.shape
        aspect_ratio = cols / rows
        
        details = {
            'image_dimensions': f"{cols}×{rows}",
            'aspect_ratio': f"{aspect_ratio:.2f}"
        }
        
        # Geometric rules (heuristic)
        valid = True
        note = ""
        
        # Chest X-Rays: typically near-square or slightly landscape
        if requested_part in ['CHEST', 'THORAX']:
            if aspect_ratio < 0.6 or aspect_ratio > 1.8:
                valid = False
                note = "Unusual aspect ratio for chest X-ray (expected ~0.8-1.4)"
        
        # Spine/long bone images: typically portrait orientation
        elif requested_part in ['SPINE', 'LUMBAR SPINE', 'CERVICAL SPINE', 'THORACIC SPINE', 'FEMUR', 'TIBIA', 'HUMERUS']:
            if aspect_ratio > 1.2:
                valid = False
                note = "Landscape orientation unexpected for spine/long bone imaging"
        
        # Extremities: variable, but very extreme ratios are suspicious
        elif requested_part in ['HAND', 'FOOT', 'WRIST', 'ANKLE']:
            if aspect_ratio < 0.3 or aspect_ratio > 3.0:
                valid = False
                note = "Extreme aspect ratio for extremity imaging"
        
        # Skull/head: typically near-square
        elif requested_part in ['SKULL', 'HEAD', 'BRAIN']:
            if aspect_ratio < 0.7 or aspect_ratio > 1.5:
                valid = False
                note = "Unusual aspect ratio for head imaging"
        
        if note:
            details['geometry_note'] = note
        
        return valid, details

    def _generate_result(
        self,
        requested_part: str,
        text_match: bool,
        geo_match: bool,
        best_tag: str,
        tags: Dict[str, str],
        geo_details: Dict
    ) -> Dict:
        """
        Generate final validation result based on all checks.
        
        Args:
            requested_part: Original requested body part
            text_match: Whether text validation passed
            geo_match: Whether geometric validation passed
            best_tag: Best matching DICOM tag (if any)
            tags: All DICOM tag values
            geo_details: Geometric validation details
            
        Returns:
            Complete validation result dictionary
        """
        # Both checks passed
        if text_match and geo_match:
            return {
                "status": "Pass",
                "severity": "none",
                "message": f"Body part verified via {best_tag}",
                "details": {
                    "requested": requested_part,
                    "validation_method": "text_match",
                    **tags,
                    **geo_details
                }
            }
        
        # Text match but geometry failed
        if text_match and not geo_match:
            return {
                "status": "Warning",
                "severity": "mild",
                "message": f"Body part tag matches but geometry is unusual: {geo_details.get('geometry_note', 'Unexpected dimensions')}",
                "details": {
                    "requested": requested_part,
                    "matched_tag": best_tag,
                    "issue": "geometric_mismatch",
                    **tags,
                    **geo_details
                }
            }
        
        # Geometry passed but no text match
        if not text_match and geo_match:
            return {
                "status": "Warning",
                "severity": "moderate",
                "message": f"Possible body part mismatch: Selected '{requested_part}' but DICOM tags suggest otherwise",
                "details": {
                    "requested": requested_part,
                    "issue": "tag_mismatch",
                    **tags,
                    **geo_details
                }
            }
        
        # Both checks failed
        if not text_match and not geo_match:
            return {
                "status": "Warning",
                "severity": "severe",
                "message": f"Body part mismatch: Selected '{requested_part}' but DICOM data and geometry suggest different anatomy",
                "details": {
                    "requested": requested_part,
                    "issue": "both_failed",
                    **tags,
                    **geo_details
                }
            }
        
        # Fallback (shouldn't reach here)
        return {
            "status": "Pass",
            "severity": "none",
            "message": "Body part validation completed",
            "details": {
                "requested": requested_part,
                **tags,
                **geo_details
            }
        }
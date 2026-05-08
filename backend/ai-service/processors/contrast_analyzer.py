import numpy as np
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

class ContrastAnalyzer:
    """
    Enhanced contrast phase analyzer for CT and MRI.
    
    CT: Analyzes Hounsfield Units to determine contrast phase
    MRI: Analyzes signal intensity distribution patterns
    
    Usage:
        analyzer = ContrastAnalyzer(arterial_threshold=150)
        result = analyzer.analyze(pixel_array, 'CT', dicom_meta={'rescale_slope': 1.0, 'rescale_intercept': -1024})
        
        print(f"Phase detected: {result['phase']}")
    """

    # HU thresholds for CT phase classification
    CT_PHASES = {
        'NON_CONTRAST': (0, 45),      # Native/unenhanced tissue
        'VENOUS': (60, 110),           # Portal venous/delayed phase
        'ARTERIAL': (130, 400),        # Arterial phase/CTA
        'LATE_ARTERIAL': (100, 130),   # Late arterial/early venous
        'DELAYED': (45, 80),           # Delayed enhancement
        'BONE_METAL': (700, 3000)      # Dense structures (not contrast)
    }

    def __init__(self, arterial_threshold: int = 150):
        """
        Initialize the contrast analyzer.
        
        Args:
            arterial_threshold: HU threshold for arterial phase detection
                              (kept for backward compatibility)
        """
        self.arterial_threshold = arterial_threshold
        logger.info(f"ContrastAnalyzer initialized with arterial_threshold={arterial_threshold}")

    def analyze(
        self,
        pixel_array: np.ndarray,
        modality: str,
        dicom_meta: Dict = None
    ) -> Dict:
        """
        Analyze contrast enhancement phase.
        
        Args:
            pixel_array: 2D numpy array of pixel intensities
            modality: Imaging modality ('CT', 'MRI', etc.)
            dicom_meta: Dict with 'rescale_slope' and 'rescale_intercept' for CT
            
        Returns:
            Dictionary with keys:
                - status: 'Pass', 'Info', or 'Error'
                - message: Phase description
                - phase: Detected contrast phase
                - score: Quality score (100 for info/classification)
                - details: Detailed metrics
        """
        try:
            modality = modality.upper()
            
            if modality == "CT":
                return self._analyze_ct(pixel_array, dicom_meta or {})
            elif modality == "MRI":
                return self._analyze_mri(pixel_array)
            else:
                return {
                    "status": "Info",
                    "message": f"Contrast analysis not specifically tuned for {modality}",
                    "phase": "unknown",
                    "score": 100,
                    "details": {"modality": modality}
                }
                
        except Exception as e:
            logger.error(f"Contrast analysis error: {str(e)}", exc_info=True)
            return {
                "status": "Error",
                "message": f"Contrast check failed: {str(e)}",
                "phase": "error",
                "score": 0,
                "details": {"error": str(e)}
            }

    def _analyze_ct(self, pixels: np.ndarray, meta: Dict) -> Dict:
        """
        CT-specific contrast analysis using Hounsfield Units.
        
        Args:
            pixels: Pixel array (raw or rescaled)
            meta: Dictionary containing rescale_slope and rescale_intercept
            
        Returns:
            Analysis result with detected phase
        """
        # Handle multi-dimensional arrays
        if pixels.ndim > 2:
            pixels = pixels[0] if pixels.ndim == 3 else pixels.squeeze()
        
        # Step 1: Convert to Hounsfield Units
        # HU = intercept + slope * pixel_value
        slope = meta.get('rescale_slope', 1.0)
        intercept = meta.get('rescale_intercept', 0.0)
        
        hu_pixels = pixels.astype(np.float64) * slope + intercept
        
        # Step 2: Extract anatomy (ignore air/table: HU < -100)
        anatomy_pixels = hu_pixels[hu_pixels > -100]
        
        if anatomy_pixels.size == 0:
            return {
                "status": "Warning",
                "message": "No anatomy detected in slice (check windowing)",
                "phase": "unknown",
                "score": 50,
                "details": {"issue": "no_anatomy"}
            }
        
        # Step 3: Analyze intensity distribution
        # Focus on high-intensity pixels (enhanced structures)
        p50 = np.percentile(anatomy_pixels, 50)
        p95 = np.percentile(anatomy_pixels, 95)
        p98 = np.percentile(anatomy_pixels, 98)
        p99 = np.percentile(anatomy_pixels, 99)
        
        # Average of top 2% (represents enhanced vessels/organs)
        top_pixels = anatomy_pixels[anatomy_pixels >= p98]
        avg_top = np.mean(top_pixels) if len(top_pixels) > 0 else p99
        
        # Step 4: Classify phase based on HU values
        phase, confidence = self._classify_ct_phase(avg_top, p95, p50)
        
        # Step 5: Generate result
        return {
            "status": "Pass",
            "message": f"Detected: {phase}",
            "phase": phase,
            "score": 100,  # This is informational, not a quality measure
            "confidence": confidence,
            "details": {
                "avg_top_hu": float(avg_top),
                "p50_hu": float(p50),
                "p95_hu": float(p95),
                "p98_hu": float(p98),
                "p99_hu": float(p99),
                "peak_hu": float(np.max(anatomy_pixels)),
                "modality": "CT",
                "rescale_slope": slope,
                "rescale_intercept": intercept
            }
        }

    def _classify_ct_phase(self, avg_top: float, p95: float, median: float) -> Tuple[str, float]:
        """
        Classify CT contrast phase based on HU statistics.
        
        Args:
            avg_top: Average HU of top 2% brightest pixels
            p95: 95th percentile HU
            median: 50th percentile HU
            
        Returns:
            Tuple of (phase_name, confidence)
        """
        confidence = 0.85  # Default confidence
        
        # Arterial phase: very bright vessels
        if avg_top >= self.CT_PHASES['ARTERIAL'][0]:
            if avg_top > 250:
                return "Arterial Phase (High Contrast / CTA)", 0.95
            else:
                return "Arterial Phase", 0.90
        
        # Late arterial / early venous
        elif avg_top >= self.CT_PHASES['LATE_ARTERIAL'][0]:
            return "Late Arterial / Early Venous Phase", 0.80
        
        # Portal venous / parenchymal phase
        elif avg_top >= self.CT_PHASES['VENOUS'][0]:
            return "Portal Venous / Parenchymal Phase", 0.85
        
        # Delayed phase
        elif avg_top >= self.CT_PHASES['DELAYED'][0]:
            return "Delayed Phase / Mild Enhancement", 0.75
        
        # Non-contrast
        else:
            # Additional check: if p95 is also low, definitely non-contrast
            if p95 < 60:
                return "Non-Contrast", 0.95
            else:
                return "Non-Contrast / Native", 0.80

    def _analyze_mri(self, pixels: np.ndarray) -> Dict:
        """
        MRI-specific signal intensity analysis.
        
        Since MRI values are arbitrary (scanner-dependent), we analyze
        relative signal patterns rather than absolute values.
        
        Args:
            pixels: Pixel array
            
        Returns:
            Analysis result
        """
        # Handle multi-dimensional arrays
        if pixels.ndim > 2:
            pixels = pixels[0] if pixels.ndim == 3 else pixels.squeeze()
        
        # Remove background (very low signal)
        threshold = np.percentile(pixels, 5)
        tissue_pixels = pixels[pixels > threshold]
        
        if tissue_pixels.size == 0:
            return {
                "status": "Warning",
                "message": "No tissue signal detected",
                "phase": "unknown",
                "score": 50,
                "details": {"issue": "no_signal"}
            }
        
        # Statistical analysis
        mean_signal = np.mean(tissue_pixels)
        std_signal = np.std(tissue_pixels)
        peak_signal = np.percentile(tissue_pixels, 99.5)
        
        # Signal Intensity Ratio (SIR)
        # High SIR suggests contrast enhancement or specific sequences
        sir = peak_signal / (mean_signal + 1e-5)
        
        # Dynamic range
        dynamic_range = peak_signal - np.percentile(tissue_pixels, 1)
        
        # Classify based on signal patterns
        if sir > 4.0:
            phase = "High Contrast / T1 Post-Contrast / Fat-Saturated"
            confidence = 0.75
        elif sir > 2.5:
            phase = "Moderate Contrast / Mixed Weighting"
            confidence = 0.70
        else:
            phase = "Natural Signal Distribution / T2 or Non-Contrast"
            confidence = 0.65
        
        return {
            "status": "Pass",
            "message": phase,
            "phase": phase,
            "score": 100,
            "confidence": confidence,
            "details": {
                "signal_intensity_ratio": float(sir),
                "mean_signal": float(mean_signal),
                "std_signal": float(std_signal),
                "peak_signal": float(peak_signal),
                "dynamic_range": float(dynamic_range),
                "modality": "MRI"
            }
        }
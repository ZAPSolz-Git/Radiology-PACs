import cv2
import numpy as np
from scipy import ndimage
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

class BlurDetector:
    """
    Enhanced multi-method blur detector for medical images.
    
    Detection Methods:
    - Laplacian Variance: Spatial domain sharpness
    - FFT Magnitude: Frequency domain analysis
    - Tenengrad: Gradient-based focus measure
    
    Usage:
        detector = BlurDetector(threshold=80.0)
        result = detector.analyze(pixel_array, modality='CT')
        
        if result['status'] == 'Warning':
            print(f"Blur detected: {result['severity']} (Score: {result['score']})")
    """

    # Modality-specific thresholds and weights
    # Lower threshold = stricter detection (more likely to flag as blurry)
    CONFIGS = {
        'MRI': {
            'laplacian_threshold': 50.0,
            'fft_threshold': 15.0,
            'tenengrad_threshold': 100.0,
            'weights': {'laplacian': 0.3, 'fft': 0.5, 'tenengrad': 0.2},
            'description': 'Optimized for gradient echo and spin echo sequences'
        },
        'CT': {
            'laplacian_threshold': 80.0,
            'fft_threshold': 20.0,
            'tenengrad_threshold': 150.0,
            'weights': {'laplacian': 0.5, 'fft': 0.3, 'tenengrad': 0.2},
            'description': 'Optimized for axial CT slices'
        },
        'CR': {  # X-Ray (Computed Radiography)
            'laplacian_threshold': 30.0,
            'fft_threshold': 10.0,
            'tenengrad_threshold': 50.0,
            'weights': {'laplacian': 0.4, 'fft': 0.4, 'tenengrad': 0.2},
            'description': 'Optimized for projection radiography'
        },
        'DX': {  # Digital X-Ray
            'laplacian_threshold': 30.0,
            'fft_threshold': 10.0,
            'tenengrad_threshold': 50.0,
            'weights': {'laplacian': 0.4, 'fft': 0.4, 'tenengrad': 0.2},
            'description': 'Optimized for digital radiography'
        },
        'DEFAULT': {
            'laplacian_threshold': 50.0,
            'fft_threshold': 15.0,
            'tenengrad_threshold': 100.0,
            'weights': {'laplacian': 0.33, 'fft': 0.33, 'tenengrad': 0.34},
            'description': 'Generic configuration for unknown modalities'
        }
    }

    def __init__(self, threshold: float = None):
        """
        Initialize the blur detector.
        
        Args:
            threshold: Legacy threshold parameter (kept for backward compatibility)
                      Modern usage relies on modality-specific configs
        """
        self.default_threshold = threshold if threshold else 50.0
        logger.info(f"BlurDetector initialized with default threshold={self.default_threshold}")

    def analyze(self, pixel_array: np.ndarray, modality: str = 'MRI') -> Dict:
        """
        Analyze image for blur using weighted consensus of multiple methods.
        
        Args:
            pixel_array: 2D numpy array of image intensities
            modality: Imaging modality ('MRI', 'CT', 'CR', 'DX')
            
        Returns:
            Dictionary with keys:
                - status: 'Pass', 'Warning', or 'Error'
                - message: Human-readable description
                - score: Quality score (0-100, higher = sharper)
                - severity: 'none', 'mild', 'moderate', or 'severe'
                - confidence: Algorithm confidence
                - details: Raw scores from each method
        """
        try:
            # Step 1: Normalize and preprocess
            img = self._preprocess_image(pixel_array)
            
            # Step 2: Extract region of interest (remove black borders)
            roi = self._extract_roi(img)
            
            if roi.size == 0:
                return {
                    "status": "Warning",
                    "message": "Image empty or too dark",
                    "score": 0,
                    "severity": "severe",
                    "confidence": 0.5,
                    "details": {}
                }

            # Step 3: Get modality configuration
            config = self.CONFIGS.get(modality.upper(), self.CONFIGS['DEFAULT'])
            
            # Step 4: Run blur detection algorithms
            laplacian_score = self._detect_laplacian(roi)
            fft_score = self._detect_fft(roi)
            tenengrad_score = self._detect_tenengrad(roi)
            
            # Step 5: Map raw scores to quality indices (0-100)
            q_lap = self._map_to_quality(laplacian_score, config['laplacian_threshold'])
            q_fft = self._map_to_quality(fft_score, config['fft_threshold'])
            q_ten = self._map_to_quality(tenengrad_score, config['tenengrad_threshold'])
            
            # Step 6: Calculate weighted final score
            weights = config['weights']
            final_score = (
                q_lap * weights['laplacian'] +
                q_fft * weights['fft'] +
                q_ten * weights['tenengrad']
            )
            
            # Step 7: Determine severity and status
            severity, status, message = self._classify_blur(final_score)
            
            # Calculate confidence based on agreement between methods
            method_scores = [q_lap, q_fft, q_ten]
            score_variance = np.var(method_scores)
            # High variance = methods disagree = lower confidence
            confidence = max(0.5, 1.0 - (score_variance / 1000.0))
            
            return {
                "score": int(final_score),
                "severity": severity,
                "status": status,
                "message": message,
                "confidence": float(confidence),
                "details": {
                    "laplacian_raw": float(laplacian_score),
                    "laplacian_quality": float(q_lap),
                    "fft_raw": float(fft_score),
                    "fft_quality": float(q_fft),
                    "tenengrad_raw": float(tenengrad_score),
                    "tenengrad_quality": float(q_ten),
                    "roi_size": roi.shape,
                    "modality": modality.upper()
                }
            }

        except Exception as e:
            logger.error(f"Blur detection error: {str(e)}", exc_info=True)
            return {
                "status": "Error",
                "message": f"Blur check failed: {str(e)}",
                "score": 0,
                "severity": "none",
                "confidence": 0.0,
                "details": {"error": str(e)}
            }

    def _preprocess_image(self, pixels: np.ndarray) -> np.ndarray:
        """
        Normalize image to 0-255 uint8 range.
        
        Handles:
            - 2D grayscale images
            - Multi-frame sequences (uses first frame)
        """
        if pixels.ndim == 2:
            norm = cv2.normalize(pixels, None, 0, 255, cv2.NORM_MINMAX)
            return norm.astype(np.uint8)
        elif pixels.ndim == 3:
            # Multi-frame: use first frame
            norm = cv2.normalize(pixels[0], None, 0, 255, cv2.NORM_MINMAX)
            return norm.astype(np.uint8)
        else:
            raise ValueError(f"Unsupported pixel array dimensions: {pixels.shape}")

    def _extract_roi(self, img: np.ndarray) -> np.ndarray:
        """
        Extract region of interest (anatomy) from image.
        
        Removes black borders and background to focus on actual content.
        This prevents background pixels from skewing blur metrics.
        
        Returns:
            Cropped image containing only the anatomical region
        """
        # Threshold to separate background (dark) from anatomy
        _, thresh = cv2.threshold(img, 15, 255, cv2.THRESH_BINARY)
        
        # Find bounding box of non-zero pixels
        coords = cv2.findNonZero(thresh)
        
        if coords is None:
            # No ROI detected, return original
            logger.warning("No ROI detected, using full image")
            return img
        
        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(coords)
        
        # Crop to ROI with small padding
        pad = 5
        y1 = max(0, y - pad)
        y2 = min(img.shape[0], y + h + pad)
        x1 = max(0, x - pad)
        x2 = min(img.shape[1], x + w + pad)
        
        return img[y1:y2, x1:x2]

    def _detect_laplacian(self, img: np.ndarray) -> float:
        """
        Laplacian variance method for blur detection.
        
        Theory: Sharp images have high variance in the Laplacian
        (second derivative), while blurred images have low variance.
        
        Returns:
            Variance of the Laplacian operator
        """
        laplacian = cv2.Laplacian(img, cv2.CV_64F)
        variance = laplacian.var()
        return float(variance)

    def _detect_fft(self, img: np.ndarray) -> float:
        """
        FFT magnitude method for blur detection.
        
        Theory: Blurred images have less high-frequency content.
        We measure the mean magnitude in the frequency spectrum.
        
        Returns:
            Mean magnitude of frequency spectrum
        """
        # 2D FFT
        f = np.fft.fft2(img)
        fshift = np.fft.fftshift(f)
        
        # Magnitude spectrum (log scale for stability)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
        
        # Return mean magnitude
        return float(np.mean(magnitude_spectrum))

    def _detect_tenengrad(self, img: np.ndarray) -> float:
        """
        Tenengrad (Sobel variance) method for blur detection.
        
        Theory: Measures the mean squared gradient magnitude.
        Sharp images have strong gradients at edges.
        
        Returns:
            Mean of squared gradient magnitude
        """
        # Sobel gradients
        gx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
        
        # Squared gradient magnitude
        fm = gx**2 + gy**2
        
        return float(np.mean(fm))

    def _map_to_quality(self, raw_score: float, threshold: float) -> float:
        """
        Map raw metric to 0-100 quality score.
        
        Mapping:
            - score == threshold → quality = 50
            - score >> threshold → quality → 100
            - score << threshold → quality → 0
        
        Args:
            raw_score: Raw metric value from detection method
            threshold: Expected threshold for this metric
            
        Returns:
            Quality score (0-100)
        """
        if raw_score <= 0:
            return 0.0
        
        # Calculate ratio to threshold
        ratio = raw_score / (threshold + 1e-5)
        
        # Linear mapping centered at threshold
        # Ratio = 1.0 → Score = 50
        # Ratio = 2.0 → Score = 100
        score = 50 * ratio
        
        return float(min(100, max(0, score)))

    def _classify_blur(self, quality_score: float) -> Tuple[str, str, str]:
        """
        Classify blur severity based on quality score.
        
        Args:
            quality_score: Combined quality score (0-100)
            
        Returns:
            Tuple of (severity, status, message)
        """
        if quality_score < 30:
            severity = 'severe'
            status = 'Warning'
            message = "Severe blur detected"
        elif quality_score < 50:
            severity = 'moderate'
            status = 'Warning'
            message = "Moderate blur detected"
        elif quality_score < 70:
            severity = 'mild'
            status = 'Pass'  # Mild blur is usually acceptable
            message = "Mild blur detected (acceptable)"
        else:
            severity = 'none'
            status = 'Pass'
            message = "Image is sharp"
        
        return severity, status, message
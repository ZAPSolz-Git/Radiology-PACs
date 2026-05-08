import cv2
import numpy as np
from scipy import ndimage
from typing import Dict, Optional, Tuple, List
import logging

logger = logging.getLogger(__name__)

class MotionDetector:
    """
    Multi-method motion artifact detector optimized for medical imaging.
    Supports modality-specific detection (MRI, CT, X-Ray) and body part adaptation.
    
    Detection Methods:
    - Edge Analysis: Detects ghosting artifacts in background regions
    - Gradient Analysis: Identifies unexpected intensity changes
    - Frequency Analysis: Detects periodic ghosting patterns via FFT
    - Statistical Analysis: Evaluates background uniformity
    
    Usage:
        detector = MotionDetector(sensitivity=0.8, modality='MRI', body_part='BRAIN')
        result = detector.analyze(pixel_array)
        
        if result['status'] == 'Warning':
            print(f"Motion detected: {result['severity']} (Score: {result['score']})")
    """
    
    # Modality-specific configurations
    MODALITY_CONFIGS = {
        'MRI': {
            'methods': ['edge', 'gradient', 'frequency'],
            'edge_weight': 0.35,
            'gradient_weight': 0.30,
            'frequency_weight': 0.35,
            'base_threshold': 5.0,
            'canny_low': 30,
            'canny_high': 70,
            'description': 'Optimized for phase-encoding ghosting artifacts'
        },
        'CT': {
            'methods': ['edge', 'gradient', 'statistical'],
            'edge_weight': 0.40,
            'gradient_weight': 0.35,
            'statistical_weight': 0.25,
            'base_threshold': 6.0,
            'canny_low': 40,
            'canny_high': 90,
            'description': 'Optimized for motion streaking and blurring'
        },
        'CR': {  # X-Ray (Computed Radiography)
            'methods': ['gradient', 'statistical'],
            'gradient_weight': 0.60,
            'statistical_weight': 0.40,
            'base_threshold': 8.0,
            'canny_low': 50,
            'canny_high': 100,
            'description': 'Optimized for respiratory motion blur'
        },
        'DX': {  # Digital X-Ray
            'methods': ['gradient', 'statistical'],
            'gradient_weight': 0.60,
            'statistical_weight': 0.40,
            'base_threshold': 8.0,
            'canny_low': 50,
            'canny_high': 100,
            'description': 'Optimized for respiratory motion blur'
        }
    }
    
    # Body part specific adjustments
    BODY_PART_CONFIGS = {
        'HEAD': {'bg_threshold_percentile': 5, 'requires_clear_bg': True},
        'BRAIN': {'bg_threshold_percentile': 5, 'requires_clear_bg': True},
        'CHEST': {'bg_threshold_percentile': 10, 'requires_clear_bg': True},
        'ABDOMEN': {'bg_threshold_percentile': 15, 'requires_clear_bg': False},
        'PELVIS': {'bg_threshold_percentile': 15, 'requires_clear_bg': False},
        'EXTREMITY': {'bg_threshold_percentile': 8, 'requires_clear_bg': True},
        'KNEE': {'bg_threshold_percentile': 8, 'requires_clear_bg': True},
        'SHOULDER': {'bg_threshold_percentile': 8, 'requires_clear_bg': True},
        'HAND': {'bg_threshold_percentile': 8, 'requires_clear_bg': True},
        'FOOT': {'bg_threshold_percentile': 8, 'requires_clear_bg': True},
        'SPINE': {'bg_threshold_percentile': 12, 'requires_clear_bg': True},
        'NECK': {'bg_threshold_percentile': 10, 'requires_clear_bg': True},
    }
    
    def __init__(self, sensitivity: float = 0.8, modality: str = 'MRI', body_part: Optional[str] = None):
        """
        Initialize the motion detector.
        
        Args:
            sensitivity: Detection sensitivity (0.0 to 1.0)
                        0.6 = Conservative (fewer false positives)
                        0.8 = Balanced (recommended)
                        0.9 = Aggressive (catch subtle motion)
            modality: Imaging modality ('MRI', 'CT', 'CR', 'DX')
            body_part: Body region being scanned (optional, improves accuracy)
        """
        self.sensitivity = np.clip(sensitivity, 0.0, 1.0)
        self.modality = modality.upper() if modality else 'MRI'
        self.body_part = body_part.upper() if body_part else None
        
        # Load modality configuration
        self.config = self.MODALITY_CONFIGS.get(
            self.modality, 
            self.MODALITY_CONFIGS['MRI']
        ).copy()  # Copy to avoid modifying the class constant
        
        # Apply body part adjustments if provided
        if self.body_part:
            body_config = self._get_body_part_config(self.body_part)
            self.config.update(body_config)
        
        logger.info(f"MotionDetector initialized: {self.modality}, sensitivity={self.sensitivity}")
    
    def _get_body_part_config(self, body_part: str) -> Dict:
        """
        Match body part to configuration with fuzzy matching.
        
        Args:
            body_part: Requested body part name
            
        Returns:
            Configuration dictionary for the body part
        """
        body_upper = body_part.upper()
        
        # Direct match
        if body_upper in self.BODY_PART_CONFIGS:
            return self.BODY_PART_CONFIGS[body_upper]
        
        # Fuzzy matching for partial matches
        for key in self.BODY_PART_CONFIGS:
            if key in body_upper or body_upper in key:
                logger.info(f"Fuzzy matched '{body_part}' to '{key}' configuration")
                return self.BODY_PART_CONFIGS[key]
        
        # Default configuration
        logger.warning(f"No specific config for body part '{body_part}', using default")
        return {'bg_threshold_percentile': 10, 'requires_clear_bg': True}
    
    def analyze(self, pixel_array: np.ndarray, modality: Optional[str] = None) -> Dict:
        """
        Analyze image for motion artifacts.
        
        Args:
            pixel_array: 2D numpy array of image intensities
            modality: Override modality for this specific analysis
            
        Returns:
            Dictionary with keys:
                - status: 'Pass', 'Warning', or 'Error'
                - message: Human-readable description
                - score: Numerical quality score (lower = more motion)
                - severity: 'none', 'mild', 'moderate', or 'severe'
                - confidence: Algorithm confidence (0.0 to 1.0)
                - details: Detailed metrics from all methods
        """
        try:
            # Handle modality override for single analysis
            if modality and modality.upper() != self.modality:
                temp_config = self.MODALITY_CONFIGS.get(modality.upper())
                if temp_config:
                    original_config = self.config
                    self.config = temp_config.copy()
                    result = self._perform_analysis(pixel_array)
                    self.config = original_config
                    return result
            
            return self._perform_analysis(pixel_array)
            
        except Exception as e:
            logger.error(f"Motion detection error: {str(e)}", exc_info=True)
            return {
                "status": "Error",
                "message": f"Motion analysis failed: {str(e)}",
                "score": 0.0,
                "severity": "none",
                "confidence": 0.0,
                "details": {"error": str(e)}
            }
    
    def _perform_analysis(self, pixel_array: np.ndarray) -> Dict:
        """
        Core analysis logic with multi-method detection.
        
        Workflow:
            1. Normalize image to uint8
            2. Segment foreground (anatomy) and background (air)
            3. Run configured detection methods
            4. Combine results with weighted scoring
        """
        # Step 1: Normalize and validate input
        img = self._normalize_image(pixel_array)
        
        # Step 2: Segment image into foreground and background
        fg_mask, bg_mask = self._segment_image(img)
        
        # Step 3: Check if we have sufficient background for analysis
        bg_ratio = np.sum(bg_mask > 0) / bg_mask.size
        
        if bg_ratio < 0.05 and self.config.get('requires_clear_bg', True):
            # Insufficient background - fallback to foreground-only methods
            logger.warning(f"Insufficient background ({bg_ratio:.1%}), using foreground methods only")
            return self._analyze_foreground_only(img, fg_mask)
        
        # Step 4: Run configured detection methods
        results = {}
        methods = self.config.get('methods', ['edge', 'gradient'])
        
        if 'edge' in methods:
            results['edge'] = self._detect_edge_artifacts(img, bg_mask)
        if 'gradient' in methods:
            results['gradient'] = self._detect_gradient_artifacts(img, bg_mask)
        if 'frequency' in methods:
            results['frequency'] = self._detect_frequency_artifacts(img, fg_mask)
        if 'statistical' in methods:
            results['statistical'] = self._detect_statistical_artifacts(img, bg_mask)
        
        # Step 5: Combine results with weighted scoring
        return self._combine_results(results)
    
    def _normalize_image(self, pixel_array: np.ndarray) -> np.ndarray:
        """
        Robust normalization handling various DICOM bit depths.
        
        Supports:
            - 8-bit grayscale (uint8)
            - 12-bit/16-bit unsigned (uint16)
            - Signed integers with Hounsfield units (int16)
            - Multi-frame sequences
        """
        # Handle multi-dimensional arrays
        if pixel_array.ndim != 2:
            if pixel_array.ndim == 3:
                # Multi-frame: take middle frame (most representative)
                mid_frame = pixel_array.shape[0] // 2
                pixel_array = pixel_array[mid_frame]
                logger.debug(f"Using frame {mid_frame} from multi-frame sequence")
            else:
                raise ValueError(f"Unsupported array shape: {pixel_array.shape}")
        
        # Handle different bit depths and data types
        if pixel_array.dtype == np.uint16:
            # DICOM 12-bit or 16-bit unsigned
            # Use 99.5th percentile to avoid outliers skewing normalization
            nonzero_pixels = pixel_array[pixel_array > 0]
            if len(nonzero_pixels) > 0:
                max_val = np.percentile(nonzero_pixels, 99.5)
            else:
                max_val = np.max(pixel_array)
            
            img = np.clip(pixel_array / (max_val + 1e-6) * 255, 0, 255).astype(np.uint8)
            
        elif pixel_array.dtype == np.int16:
            # Signed int (CT Hounsfield units)
            pixel_array = pixel_array.astype(np.float32)
            
            # Apply windowing for CT images
            if self.modality == 'CT':
                # Soft tissue window (most common for motion detection)
                window_center = 40
                window_width = 400
                img_min = window_center - window_width / 2
                img_max = window_center + window_width / 2
                pixel_array = np.clip(pixel_array, img_min, img_max)
            
            img = cv2.normalize(pixel_array, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
            
        else:
            # Standard normalization for other types
            img = cv2.normalize(pixel_array, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        return img
    
    def _segment_image(self, img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Adaptive foreground/background segmentation.
        
        Uses percentile-based thresholding followed by morphological cleanup
        to robustly separate anatomy from air/background.
        
        Returns:
            Tuple of (foreground_mask, background_mask) as uint8 arrays
        """
        # Apply Gaussian blur to reduce noise before thresholding
        blur = cv2.GaussianBlur(img, (5, 5), 0)
        
        # Get threshold from body part configuration
        bg_percentile = self.config.get('bg_threshold_percentile', 10)
        
        # Calculate threshold value
        nonzero_pixels = img[img > 0]
        if len(nonzero_pixels) > 0:
            threshold_val = np.percentile(nonzero_pixels, bg_percentile)
        else:
            threshold_val = 10
        
        # Apply threshold
        _, fg_mask = cv2.threshold(blur, threshold_val, 255, cv2.THRESH_BINARY)
        
        # Morphological operations to clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        
        # Close small holes in foreground
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        # Remove small noise in background
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Ensure we have at least some foreground (fallback to Otsu)
        fg_ratio = np.sum(fg_mask > 0) / fg_mask.size
        if fg_ratio < 0.1:
            logger.warning(f"Low foreground ratio ({fg_ratio:.1%}), using Otsu thresholding")
            _, fg_mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Background is inverse of foreground
        bg_mask = cv2.bitwise_not(fg_mask)
        
        return fg_mask, bg_mask
    
    def _detect_edge_artifacts(self, img: np.ndarray, bg_mask: np.ndarray) -> Dict:
        """
        Detect ghosting artifacts via edge analysis in background.
        
        Theory: Motion creates "ghost" copies of anatomy that appear as
        structured edges in what should be uniform background (air).
        
        Method:
            1. Multi-scale Canny edge detection
            2. Extract edges in background only
            3. Analyze edge density and structure
        """
        canny_low = self.config.get('canny_low', 30)
        canny_high = self.config.get('canny_high', 70)
        
        # Multi-scale edge detection (fine + coarse)
        edges_fine = cv2.Canny(img, canny_low, canny_high)
        edges_coarse = cv2.Canny(img, canny_low + 20, canny_high + 30)
        edges = cv2.bitwise_or(edges_fine, edges_coarse)
        
        # Extract ghost edges (edges in background only)
        ghost_edges = cv2.bitwise_and(edges, edges, mask=bg_mask)
        
        # Calculate metrics
        ghost_pixel_count = np.count_nonzero(ghost_edges)
        total_bg_pixels = np.count_nonzero(bg_mask)
        
        if total_bg_pixels == 0:
            return {'score': 0.0, 'confidence': 0.0, 'components': 0}
        
        # Ghosting ratio (percentage of background with edges)
        ghosting_ratio = (ghost_pixel_count / total_bg_pixels) * 100
        
        # Connected component analysis for structured artifacts
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            ghost_edges, connectivity=8
        )
        
        # Filter out noise (components smaller than 10 pixels)
        significant_components = 0
        if num_labels > 1:
            areas = stats[1:, cv2.CC_STAT_AREA]  # Skip background label (0)
            significant_components = np.sum(areas > 10)
        
        # Confidence based on edge density
        confidence = min(1.0, ghosting_ratio / 10.0)
        
        return {
            'score': ghosting_ratio,
            'components': int(significant_components),
            'confidence': confidence,
            'ghost_pixels': int(ghost_pixel_count),
            'bg_pixels': int(total_bg_pixels)
        }
    
    def _detect_gradient_artifacts(self, img: np.ndarray, bg_mask: np.ndarray) -> Dict:
        """
        Detect artifacts using gradient magnitude in background.
        
        Theory: Background should have minimal gradient (uniform intensity).
        Motion causes high gradients where there should be none.
        
        Method:
            1. Sobel gradient computation (x and y directions)
            2. Calculate gradient magnitude
            3. Analyze statistics in background only
        """
        # Sobel gradients
        grad_x = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
        
        # Gradient magnitude
        gradient_mag = np.sqrt(grad_x**2 + grad_y**2)
        gradient_mag = cv2.normalize(gradient_mag, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        # Extract background gradients only
        bg_gradients = cv2.bitwise_and(gradient_mag, gradient_mag, mask=bg_mask)
        bg_gradient_values = bg_gradients[bg_mask > 0]
        
        if len(bg_gradient_values) == 0:
            return {'score': 0.0, 'confidence': 0.0}
        
        # Statistical measures
        mean_grad = np.mean(bg_gradient_values)
        std_grad = np.std(bg_gradient_values)
        p95_grad = np.percentile(bg_gradient_values, 95)
        
        # Composite score (mean weighted by variability)
        score = mean_grad * (1 + std_grad / 50.0)
        
        # Confidence based on score magnitude
        confidence = min(1.0, score / 20.0)
        
        return {
            'score': float(score),
            'mean': float(mean_grad),
            'std': float(std_grad),
            'p95': float(p95_grad),
            'confidence': confidence
        }
    
    def _detect_frequency_artifacts(self, img: np.ndarray, fg_mask: np.ndarray) -> Dict:
        """
        Detect ringing/ghosting using frequency domain analysis (FFT).
        
        Theory: Motion creates periodic patterns (ghosts) that appear as
        characteristic peaks in the frequency spectrum.
        
        Method:
            1. 2D Fast Fourier Transform on foreground
            2. Analyze frequency band energy distribution
            3. Detect periodic peaks away from DC component
        """
        # Extract foreground region for FFT
        fg_region = cv2.bitwise_and(img, img, mask=fg_mask)
        
        # 2D FFT
        f_transform = np.fft.fft2(fg_region)
        f_shift = np.fft.fftshift(f_transform)  # Shift zero frequency to center
        magnitude_spectrum = np.abs(f_shift)
        
        # Log scale for better visualization and analysis
        magnitude_spectrum = np.log1p(magnitude_spectrum)
        
        h, w = magnitude_spectrum.shape
        center_y, center_x = h // 2, w // 2
        
        # Create radial distance map from center
        y, x = np.ogrid[:h, :w]
        distances = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        
        # Define frequency bands
        # Low: Near DC component (bulk signal)
        # Mid: Moderate frequencies (normal texture)
        # High: High frequencies (noise and artifacts)
        low_freq = (distances > 2) & (distances < h * 0.1)
        mid_freq = (distances >= h * 0.1) & (distances < h * 0.3)
        high_freq = (distances >= h * 0.3)
        
        # Calculate energy in each band
        mid_energy = np.mean(magnitude_spectrum[mid_freq]) if np.any(mid_freq) else 0
        high_energy = np.mean(magnitude_spectrum[high_freq]) if np.any(high_freq) else 0
        low_energy = np.mean(magnitude_spectrum[low_freq]) if np.any(low_freq) else 0
        
        # Frequency ratio (motion enhances mid-high frequencies)
        freq_ratio = (mid_energy + high_energy) / (low_energy + 1e-6)
        
        # Detect periodic peaks (ghosting signature)
        # Look for bright spots in outer regions (away from DC)
        outer_region = distances > h * 0.15
        outer_spectrum = magnitude_spectrum.copy()
        outer_spectrum[~outer_region] = 0
        
        num_peaks = 0
        if np.any(outer_region):
            threshold = np.percentile(outer_spectrum[outer_region], 95)
            peaks = outer_spectrum > threshold
            num_peaks = np.sum(peaks)
        
        # Composite score
        score = freq_ratio * (1 + np.log1p(num_peaks) / 10)
        
        # Confidence based on score magnitude
        confidence = min(1.0, score / 5.0)
        
        return {
            'score': float(score),
            'freq_ratio': float(freq_ratio),
            'num_peaks': int(num_peaks),
            'low_energy': float(low_energy),
            'mid_energy': float(mid_energy),
            'high_energy': float(high_energy),
            'confidence': confidence
        }
    
    def _detect_statistical_artifacts(self, img: np.ndarray, bg_mask: np.ndarray) -> Dict:
        """
        Statistical analysis of background uniformity.
        
        Theory: Background should be statistically uniform (consistent noise).
        Motion disrupts this uniformity, creating local variance.
        
        Method:
            1. Calculate global background statistics
            2. Divide background into grid patches
            3. Analyze variance of local variances
        """
        bg_pixels = img[bg_mask > 0]
        
        if len(bg_pixels) == 0:
            return {'score': 0.0, 'confidence': 0.0}
        
        # Global statistics
        mean_bg = np.mean(bg_pixels)
        std_bg = np.std(bg_pixels)
        cv_bg = std_bg / (mean_bg + 1e-6)  # Coefficient of variation
        
        # Local variance analysis
        h, w = bg_mask.shape
        grid_size = 32
        local_vars = []
        
        # Divide background into grid patches
        for i in range(0, h - grid_size, grid_size):
            for j in range(0, w - grid_size, grid_size):
                patch_mask = bg_mask[i:i+grid_size, j:j+grid_size]
                
                # Only analyze patches with sufficient background pixels
                if np.sum(patch_mask) > grid_size * 2:
                    patch = img[i:i+grid_size, j:j+grid_size]
                    patch_bg = patch[patch_mask > 0]
                    if len(patch_bg) > 0:
                        local_vars.append(np.var(patch_bg))
        
        # Variance of variances (measures uniformity)
        var_of_vars = np.var(local_vars) if len(local_vars) > 0 else 0
        
        # Composite score
        score = cv_bg * 100 + np.log1p(var_of_vars) / 10
        
        # Confidence based on score magnitude
        confidence = min(1.0, score / 15.0)
        
        return {
            'score': float(score),
            'cv': float(cv_bg),
            'var_of_vars': float(var_of_vars),
            'num_patches': len(local_vars),
            'confidence': confidence
        }
    
    def _analyze_foreground_only(self, img: np.ndarray, fg_mask: np.ndarray) -> Dict:
        """
        Fallback analysis when background is insufficient.
        
        Used for scans where anatomy fills entire field of view
        (e.g., full-FOV abdomen/pelvis scans).
        
        Relies solely on frequency domain analysis.
        """
        logger.info("Using frequency-only analysis (insufficient background)")
        
        # Use frequency domain analysis
        freq_result = self._detect_frequency_artifacts(img, fg_mask)
        
        score = freq_result['score']
        
        # Apply higher threshold for frequency-only detection
        base_threshold = self.config.get('base_threshold', 5.0)
        threshold = base_threshold * (2.0 - self.sensitivity) * 1.5
        
        has_motion = score > threshold
        
        # Determine severity
        if score < threshold * 0.5:
            severity = 'none'
        elif score < threshold:
            severity = 'mild'
        elif score < threshold * 2:
            severity = 'moderate'
        else:
            severity = 'severe'
        
        # Generate message
        if has_motion:
            message = f"{severity.capitalize()} motion artifacts detected (Score: {score:.2f})"
            status = "Warning"
        else:
            message = f"Patient stability OK (Score: {score:.2f})"
            status = "Pass"
        
        return {
            "status": status,
            "message": message,
            "score": float(score),
            "severity": severity,
            "confidence": freq_result.get('confidence', 0.5),
            "details": {
                'method': 'frequency_only',
                'note': 'Limited background available for analysis',
                'threshold': float(threshold),
                **freq_result
            }
        }
    
    def _combine_results(self, results: Dict) -> Dict:
        """
        Combine multiple detection methods with weighted scoring.
        
        Args:
            results: Dictionary of method results
            
        Returns:
            Final combined result with status, severity, and confidence
        """
        if not results:
            return {
                "status": "Pass",
                "message": "No motion detected",
                "score": 0.0,
                "severity": "none",
                "confidence": 0.0,
                "details": {}
            }
        
        # Get weights from configuration
        weights = {
            'edge': self.config.get('edge_weight', 0.33),
            'gradient': self.config.get('gradient_weight', 0.33),
            'frequency': self.config.get('frequency_weight', 0.33),
            'statistical': self.config.get('statistical_weight', 0.0)
        }
        
        # Normalize weights for available methods
        available_weights = {k: v for k, v in weights.items() if k in results}
        total_weight = sum(available_weights.values())
        
        if total_weight > 0:
            normalized_weights = {k: v / total_weight for k, v in available_weights.items()}
        else:
            # Fallback: equal weights
            normalized_weights = {k: 1.0 / len(results) for k in results}
        
        # Calculate weighted score
        weighted_score = sum(
            results[method]['score'] * normalized_weights.get(method, 0)
            for method in results
        )
        
        # Calculate average confidence
        confidences = [results[method].get('confidence', 0.5) for method in results]
        avg_confidence = np.mean(confidences)
        
        # Adaptive threshold based on sensitivity
        base_threshold = self.config.get('base_threshold', 5.0)
        threshold = base_threshold * (2.0 - self.sensitivity)
        
        # Determine if motion is present
        has_motion = weighted_score > threshold
        
        # Classify severity
        if weighted_score < threshold * 0.5:
            severity = 'none'
        elif weighted_score < threshold:
            severity = 'mild'
        elif weighted_score < threshold * 2:
            severity = 'moderate'
        else:
            severity = 'severe'
        
        # Generate status and message
        if has_motion:
            message = f"{severity.capitalize()} motion artifacts (Score: {weighted_score:.2f}, Confidence: {avg_confidence:.1%})"
            status = "Warning"
        else:
            message = f"Patient stability OK (Score: {weighted_score:.2f})"
            status = "Pass"
        
        return {
            "status": status,
            "message": message,
            "score": float(weighted_score),
            "severity": severity,
            "confidence": float(avg_confidence),
            "details": {
                'threshold': float(threshold),
                'modality': self.modality,
                'body_part': self.body_part,
                'sensitivity': self.sensitivity,
                'methods_used': list(results.keys()),
                'method_weights': normalized_weights,
                **{method: results[method] for method in results}
            }
        }
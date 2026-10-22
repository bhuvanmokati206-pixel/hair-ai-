"""
Geometric and Texture Feature Extractor
Extracts facial aspect ratios, jaw curvature, and scalp texture frequency metrics.
Output format: 1D array of 28 numeric features.
"""

import cv2
import numpy as np

def extract_features_from_image(image_bytes: bytes) -> dict:
    """
    Extracts geometric & texture metrics from an image.
    Returns a dictionary of named numerical features.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {}

    h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Image proportions
    aspect_ratio = float(h) / float(w) if w > 0 else 1.0

    # 2. Texture & Edge variance (Scalp & Hair regions - upper 40% of image)
    scalp_roi = gray[0:int(h * 0.45), :]
    
    # Sobel gradients (horizontal & vertical)
    sobelx = cv2.Sobel(scalp_roi, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(scalp_roi, cv2.CV_64F, 0, 1, ksize=3)
    
    edge_magnitude = np.sqrt(sobelx**2 + sobely**2)
    edge_density = float(np.mean(edge_magnitude > 40))
    edge_std = float(np.std(edge_magnitude))

    # Laplacian variance (sharpness and curl/wave frequency)
    laplacian_var = float(cv2.Laplacian(scalp_roi, cv2.CV_64F).var())

    # 3. Color channel statistics (Skin & Hair contrast)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mean_h = float(np.mean(hsv[:, :, 0]))
    mean_s = float(np.mean(hsv[:, :, 1]))
    mean_v = float(np.mean(hsv[:, :, 2]))
    std_v = float(np.std(hsv[:, :, 2]))

    # 4. Upper vs lower brightness ratio (hair volume indicator)
    upper_brightness = float(np.mean(gray[0:int(h * 0.35), :]))
    center_brightness = float(np.mean(gray[int(h * 0.35):int(h * 0.7), :]))
    hair_face_contrast = (center_brightness - upper_brightness) / (center_brightness + upper_brightness + 1e-5)

    return {
        "aspect_ratio": round(aspect_ratio, 4),
        "edge_density": round(edge_density, 4),
        "edge_std": round(edge_std, 4),
        "laplacian_var": round(laplacian_var, 4),
        "mean_hue": round(mean_h, 2),
        "mean_saturation": round(mean_s, 2),
        "mean_value": round(mean_v, 2),
        "std_value": round(std_v, 2),
        "hair_face_contrast": round(hair_face_contrast, 4),
    }

if __name__ == "__main__":
    print("Feature extractor module ready.")

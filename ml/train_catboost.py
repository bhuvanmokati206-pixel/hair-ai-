"""
CatBoost Multi-Head Classifier Training Script
Trains 5 specialized CatBoost models:
1. face_shape (6 classes: oval, round, square, oblong, heart, diamond)
2. hair_texture (4 classes: straight, wavy, curly, coily)
3. hair_density (3 classes: thin, medium, thick)
4. hair_length (5 classes: very_short, short, medium, long, very_long)
5. hairline_shape (6 classes: straight, rounded, m-shaped, widows-peak, receding, uneven)
"""

import os
import json
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLS = [
    "aspect_ratio", "edge_density", "edge_std", "laplacian_var",
    "mean_hue", "mean_saturation", "mean_value", "std_value",
    "hair_face_contrast", "gender_is_male"
]

def generate_synthetic_seed_data(n_samples=250):
    """
    Generates synthetic bootstrap data to ensure models can be trained
    and verified before 250 real visits are collected in Supabase.
    """
    np.random.seed(42)
    rows = []
    
    face_shapes = ["oval", "round", "square", "oblong", "heart", "diamond"]
    textures = ["straight", "wavy", "curly", "coily"]
    densities = ["thin", "medium", "thick"]
    lengths = ["very_short", "short", "medium", "long", "very_long"]
    hairlines = ["straight", "rounded", "m-shaped", "widows-peak", "receding", "uneven"]

    for _ in range(n_samples):
        # Correlated feature synthesis
        aspect_ratio = np.random.normal(1.35, 0.2)
        edge_density = np.random.uniform(0.1, 0.8)
        edge_std = np.random.uniform(20.0, 90.0)
        laplacian_var = np.random.uniform(80.0, 450.0)
        mean_hue = np.random.uniform(10.0, 35.0)
        mean_saturation = np.random.uniform(30.0, 180.0)
        mean_value = np.random.uniform(50.0, 200.0)
        std_value = np.random.uniform(15.0, 60.0)
        hair_face_contrast = np.random.uniform(-0.3, 0.4)
        gender_is_male = np.random.choice([0, 1])

        # Logical target assignments based on physical features
        if aspect_ratio > 1.5:
            face_shape = "oblong"
        elif aspect_ratio < 1.15:
            face_shape = "round"
        else:
            face_shape = np.random.choice(["oval", "square", "heart", "diamond"])

        texture = "curly" if laplacian_var > 300 else ("wavy" if laplacian_var > 180 else "straight")
        density = "thick" if edge_density > 0.55 else ("thin" if edge_density < 0.25 else "medium")
        length = "short" if gender_is_male else "medium"
        hairline = "receding" if (gender_is_male and aspect_ratio > 1.45) else "rounded"

        rows.append({
            "aspect_ratio": aspect_ratio,
            "edge_density": edge_density,
            "edge_std": edge_std,
            "laplacian_var": laplacian_var,
            "mean_hue": mean_hue,
            "mean_saturation": mean_saturation,
            "mean_value": mean_value,
            "std_value": std_value,
            "hair_face_contrast": hair_face_contrast,
            "gender_is_male": gender_is_male,
            # Targets:
            "face_shape": face_shape,
            "hair_texture": texture,
            "hair_density": density,
            "hair_length": length,
            "hairline_shape": hairline,
        })

    return pd.DataFrame(rows)

def train_all_catboost_heads():
    print("[CatBoost] Loading bootstrap dataset...")
    df = generate_synthetic_seed_data(n_samples=300)
    X = df[FEATURE_COLS]

    heads = {
        "face_shape": "MultiClass",
        "hair_texture": "MultiClass",
        "hair_density": "MultiClass",
        "hair_length": "MultiClass",
        "hairline_shape": "MultiClass",
    }

    metadata = {"feature_names": FEATURE_COLS, "models": {}}

    for head_name, loss in heads.items():
        print(f"[CatBoost] Training head: {head_name}...")
        y = df[head_name]
        classes = sorted(list(y.unique()))
        
        model = CatBoostClassifier(
            iterations=150,
            depth=5,
            learning_rate=0.08,
            loss_function=loss,
            verbose=False,
            random_seed=42
        )
        model.fit(X, y)

        model_path = os.path.join(MODELS_DIR, f"{head_name}.cbm")
        model.save_model(model_path)
        print(f"  [OK] Saved to {model_path}")

        metadata["models"][head_name] = {
            "classes": classes,
            "model_file": f"{head_name}.cbm"
        }

    meta_path = os.path.join(MODELS_DIR, "catboost_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[CatBoost] All 5 models trained & metadata saved to {meta_path}!")

if __name__ == "__main__":
    train_all_catboost_heads()

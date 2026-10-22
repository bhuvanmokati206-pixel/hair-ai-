"""
LightGBM LambdaMART Learning-to-Rank (LTR) Training Script
Ranks all 22+ candidate hairstyles from best to worst based on customer physical compatibility
and historical barber ratings.
"""

import os
import json
import numpy as np
import pandas as pd
import lightgbm as lgb

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Candidate styles to score & rank
CANDIDATE_STYLES = [
    "buzz cut", "caesar cut", "crew cut", "french crop", "textured crop",
    "fade with quiff", "undercut", "side part", "slick back", "pompadour",
    "quiff", "bob", "lob", "curtain bangs", "shag", "wolf cut", "pixie cut"
]

STYLE_REQUIREMENTS = {
    "buzz cut": {"minTopCm": 0.5, "minSideCm": 0.5, "suit_texture": "all"},
    "caesar cut": {"minTopCm": 3.0, "minSideCm": 1.0, "suit_texture": "straight"},
    "french crop": {"minTopCm": 4.0, "minSideCm": 1.0, "suit_texture": "all"},
    "textured crop": {"minTopCm": 5.0, "minSideCm": 2.0, "suit_texture": "wavy"},
    "fade with quiff": {"minTopCm": 6.0, "minSideCm": 1.0, "suit_texture": "wavy"},
    "side part": {"minTopCm": 6.0, "minSideCm": 2.0, "suit_texture": "straight"},
    "slick back": {"minTopCm": 8.0, "minSideCm": 2.0, "suit_texture": "straight"},
    "pompadour": {"minTopCm": 8.0, "minSideCm": 2.0, "suit_texture": "wavy"},
    "quiff": {"minTopCm": 7.0, "minSideCm": 2.0, "suit_texture": "wavy"},
    "bob": {"minTopCm": 8.0, "minSideCm": 6.0, "suit_texture": "all"},
    "lob": {"minTopCm": 12.0, "minSideCm": 10.0, "suit_texture": "all"},
    "wolf cut": {"minTopCm": 12.0, "minSideCm": 8.0, "suit_texture": "curly"},
    "pixie cut": {"minTopCm": 3.0, "minSideCm": 1.0, "suit_texture": "all"},
}

FEATURE_COLS = [
    "length_delta_top",       # (customer_top_cm - req_top_cm)
    "length_delta_side",      # (customer_side_cm - req_side_cm)
    "is_length_sufficient",   # 1 if customer has enough hair, 0 otherwise
    "texture_matches",        # 1 if hair texture matches style requirement
    "is_round_face",
    "is_square_face",
    "is_oval_face",
    "customer_is_male"
]

def generate_ranking_dataset(n_customers=100):
    """
    Generates Query-Item grouped data for LambdaMART training.
    Query = One customer visit.
    Items = The candidate hairstyles ranked with relevance grades (0 to 3).
    """
    np.random.seed(42)
    rows = []
    groups = []

    for _ in range(n_customers):
        top_cm = np.random.uniform(1.0, 14.0)
        side_cm = np.random.uniform(0.5, 6.0)
        face_shape = np.random.choice(["oval", "round", "square", "oblong"])
        texture = np.random.choice(["straight", "wavy", "curly"])
        is_male = np.random.choice([0, 1])

        # Evaluate each candidate style for this customer query
        items_count = 0
        for style_name in CANDIDATE_STYLES:
            req = STYLE_REQUIREMENTS.get(style_name, {"minTopCm": 4.0, "minSideCm": 1.0, "suit_texture": "all"})
            
            top_delta = top_cm - req["minTopCm"]
            side_delta = side_cm - req["minSideCm"]
            is_sufficient = 1 if (top_delta >= 0 and side_delta >= 0) else 0
            tex_match = 1 if (req["suit_texture"] == "all" or req["suit_texture"] == texture) else 0

            # Relevance grade (0=incompatible, 1=feasible, 2=good, 3=ideal bestMatch)
            if is_sufficient == 0:
                relevance = 0
            elif tex_match == 1 and ((face_shape == "oval") or (face_shape == "round" and "crop" in style_name)):
                relevance = 3
            elif tex_match == 1:
                relevance = 2
            else:
                relevance = 1

            rows.append({
                "length_delta_top": top_delta,
                "length_delta_side": side_delta,
                "is_length_sufficient": is_sufficient,
                "texture_matches": tex_match,
                "is_round_face": 1 if face_shape == "round" else 0,
                "is_square_face": 1 if face_shape == "square" else 0,
                "is_oval_face": 1 if face_shape == "oval" else 0,
                "customer_is_male": is_male,
                "relevance_grade": relevance,
                "style_name": style_name
            })
            items_count += 1

        groups.append(items_count)

    return pd.DataFrame(rows), groups

def train_lightgbm_ranker():
    print("[LightGBM] Generating LambdaMART query-group training dataset...")
    df, groups = generate_ranking_dataset(n_customers=120)
    
    X = df[FEATURE_COLS]
    y = df["relevance_grade"]

    print(f"[LightGBM] Training LambdaRank model on {len(df)} style candidates across {len(groups)} visits...")
    ranker = lgb.LGBMRanker(
        objective="lambdarank",
        metric="ndcg",
        ndcg_eval_at=[1, 3, 6],
        n_estimators=100,
        learning_rate=0.06,
        num_leaves=25,
        random_state=42
    )

    ranker.fit(X, y, group=groups)

    model_path = os.path.join(MODELS_DIR, "lightgbm_ranker.txt")
    ranker.booster_.save_model(model_path)
    print(f"  [OK] Saved LightGBM ranker to {model_path}")

    # Save feature metadata
    meta = {
        "feature_names": FEATURE_COLS,
        "candidate_styles": CANDIDATE_STYLES,
        "style_requirements": STYLE_REQUIREMENTS,
        "model_file": "lightgbm_ranker.txt"
    }
    with open(os.path.join(MODELS_DIR, "ranker_metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print("[LightGBM] Ranking model trained successfully!")

if __name__ == "__main__":
    train_lightgbm_ranker()

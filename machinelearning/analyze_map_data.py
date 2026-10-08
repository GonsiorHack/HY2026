import os
import json
from pathlib import Path
from PIL import Image

import torch
from torchvision import models, transforms
from torch import nn


INPUT_DIR = Path("data/map_data")
OUTPUT_DIR = Path("analyzed_data")
MODEL_PATH = "surface_model.pth"
PASSABILITY_THRESHOLD = 0.4

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"Loading model from file '{MODEL_PATH}'...")
checkpoint = torch.load(MODEL_PATH, map_location=device)
class_names = checkpoint["class_names"]
category_scores = checkpoint["category_scores"]

model = models.mobilenet_v2()
model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(class_names))
model.load_state_dict(checkpoint["model_state_dict"])
model = model.to(device)
model.eval()

infer_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def evaluate_image(image_path: Path):
    img = Image.open(image_path).convert("RGB")
    tensor = infer_transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs[0], dim=0)

    pred_idx = torch.argmax(probs).item()
    folder_name = class_names[pred_idx]
    confidence = probs[pred_idx].item()

    class_info = category_scores[folder_name]
    return {
        "surface_detected": class_info["clean_name"],
        "passability_score": class_info["score"],
        "ml_confidence": round(confidence, 2)
    }

def run_analysis():
    if not INPUT_DIR.exists():
        print(f"Error: Directory '{INPUT_DIR}' does not exist!")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_features_combined = []

    subdirs = [d for d in INPUT_DIR.iterdir() if d.is_dir()]
    try:
        subdirs.sort(key=lambda x: int(x.name))
    except ValueError:
        subdirs.sort()

    print(f"Starting analysis of {len(subdirs)} zones from folder '{INPUT_DIR}'...\n")

    for folder in subdirs:
        zone_id = folder.name

        geojson_files = list(folder.glob("*.geojson")) + list(folder.glob("*.json"))
        if not geojson_files:
            print(f"[Zone {zone_id}] No .geojson file - skipping.")
            continue
        geojson_path = geojson_files[0]

        image_files = [f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS]
        if not image_files:
            print(f"[Zone {zone_id}] No image - skipping.")
            continue
        image_path = image_files[0]

        ml_res = evaluate_image(image_path)
        score = ml_res["passability_score"]
        is_passable = score >= PASSABILITY_THRESHOLD
        avoid = not is_passable

        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        features = geojson_data.get("features", [])
        for feature in features:
            if feature.get("properties") is None:
                feature["properties"] = {}

            feature["properties"].update({
                "zone_id": zone_id,
                "surface_detected": ml_res["surface_detected"],
                "passability_score": score,
                "threshold_applied": PASSABILITY_THRESHOLD,
                "is_passable_for_wheelchair": is_passable,
                "avoid": avoid,
                "ml_confidence": ml_res["ml_confidence"],
                "source_image": image_path.name
            })
            all_features_combined.append(feature)

        zone_out = OUTPUT_DIR / zone_id
        zone_out.mkdir(parents=True, exist_ok=True)
        with open(zone_out / geojson_path.name, "w", encoding="utf-8") as f:
            json.dump(geojson_data, f, indent=2, ensure_ascii=False)

        status = "PASSABLE" if is_passable else "BARRIER"
        print(f"Zone {zone_id:>2}: {ml_res['surface_detected']:<12} "
              f"(Confidence: {ml_res['ml_confidence']*100:4.1f}%, Score: {score}) -> {status}")

    combined_geojson = {
        "type": "FeatureCollection",
        "name": "Krakow_Accessibility_Zones",
        "features": all_features_combined
    }
    combined_file = OUTPUT_DIR / "all_zones.geojson"
    with open(combined_file, "w", encoding="utf-8") as f:
        json.dump(combined_geojson, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Combined GeoJSON saved to: '{combined_file}'")

if __name__ == "__main__":
    run_analysis()
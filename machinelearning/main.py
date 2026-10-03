import os
import random
from collections import defaultdict
from pathlib import Path
from PIL import Image

import torch
import torchvision
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
import torchvision.transforms.functional as TF

DATA_DIR = "data/learning"
BATCH_SIZE = 4
EPOCHS = 25
LEARNING_RATE = 0.0003
TRAIN_RATIO = 0.8

CATEGORY_SCORES = {
    "stairs0": {
        "clean_name": "stairs",
        "score": 0.0
    },
    "cobblestone2": {
        "clean_name": "cobblestone",
        "score": 0.2
    },
    "concrete10": {
        "clean_name": "concrete",
        "score": 1.0
    }
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device used: {device}")

class RandomDiscreteRotation:
    def __init__(self, angles=None):
        self.angles = [0, 90, 180, 270] if angles is None else angles

    def __call__(self, x):
        angle = random.choice(self.angles)
        return TF.rotate(x, angle)

class RandomSquareCrop:
    def __call__(self, img):
        w, h = img.size
        crop_size = min(w, h)
        if w == h:
            return img
        if w > h:
            x = random.randint(0, w - crop_size)
            return img.crop((x, 0, x + crop_size, h))
        else:
            y = random.randint(0, h - crop_size)
            return img.crop((0, y, w, y + crop_size))

class SquareCenterCrop:
    def __call__(self, img):
        w, h = img.size
        crop_size = min(w, h)
        left = (w - crop_size) // 2
        top = (h - crop_size) // 2
        return img.crop((left, top, left + crop_size, top + crop_size))

train_transform = transforms.Compose([
    RandomSquareCrop(),
    transforms.Resize((224, 224)),
    RandomDiscreteRotation([0, 90, 180, 270]),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.5),

    transforms.ColorJitter(
        brightness=(0.4, 1.3),
        contrast=(0.6, 1.4),
        saturation=(0.7, 1.3)
    ),
    transforms.RandomGrayscale(p=0.25),

    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    SquareCenterCrop(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

full_dataset = datasets.ImageFolder(root=DATA_DIR)
class_names = full_dataset.classes
print(f"Detected classes: {class_names}")

class_indices = defaultdict(list)
for idx, (_, label) in enumerate(full_dataset.samples):
    class_indices[label].append(idx)

train_indices = []
val_indices = []

random.seed(42)

print("\n--- Data split ---")
for label, indices in class_indices.items():
    random.shuffle(indices)
    split_point = int(len(indices) * TRAIN_RATIO)
    train_idx = indices[:split_point]
    val_idx = indices[split_point:]

    train_indices.extend(train_idx)
    val_indices.extend(val_idx)
    print(f"Class '{class_names[label]}': {len(indices)} samples -> Train: {len(train_idx)}, Test: {len(val_idx)}")


class DatasetWithTransform(torch.utils.data.Dataset):
    def __init__(self, base_dataset, indices, transform):
        self.base_dataset = base_dataset
        self.indices = indices
        self.transform = transform

    def __getitem__(self, idx):
        real_idx = self.indices[idx]
        img_path, label = self.base_dataset.samples[real_idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label, img_path

    def __len__(self):
        return len(self.indices)


train_data = DatasetWithTransform(full_dataset, train_indices, train_transform)
val_data = DatasetWithTransform(full_dataset, val_indices, val_transform)

train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_data, batch_size=BATCH_SIZE, shuffle=False)

model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

for param in model.parameters():
    param.requires_grad = False

for param in model.features[-1].parameters():
    param.requires_grad = True

num_classes = len(class_names)
model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)

for param in model.classifier.parameters():
    param.requires_grad = True

model = model.to(device)

criterion = nn.CrossEntropyLoss()

optimizer = optim.Adam([
    {"params": model.features[-1].parameters(), "lr": 0.00005},
    {"params": model.classifier.parameters(), "lr": LEARNING_RATE}
])

print(f"\nStarting training ({EPOCHS} epochs)...\n")

best_val_acc = -1.0
best_model_weights = None

for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0
    correct_train = 0
    total_train = 0

    for images, labels, _ in train_loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct_train += torch.sum(preds == labels.data)
        total_train += labels.size(0)

    train_acc = (correct_train.double() / total_train).item() * 100 if total_train > 0 else 0.0

    model.eval()
    correct_val = 0
    total_val = 0

    with torch.no_grad():
        for images, labels, _ in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            correct_val += torch.sum(preds == labels.data)
            total_val += labels.size(0)

    val_acc = (correct_val.double() / total_val).item() * 100 if total_val > 0 else 0.0

    marker = ""
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_model_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        marker = " [NEW RECORD]"

    print(f"Epoch [{epoch+1:02d}/{EPOCHS:02d}] - Train Acc: {train_acc:5.1f}% | Test Acc: {val_acc:5.1f}%{marker}")

if best_model_weights is not None:
    model.load_state_dict({k: v.to(device) for k, v in best_model_weights.items()})
    print(f"\nRestored model from best epoch (Test Acc: {best_val_acc:.1f}%)")

print("\n" + "="*70)
print("DETAILED ERROR ANALYSIS ON THE TEST SET (BEST MODEL):")
print("="*70)

model.eval()
errors_found = 0
correct_per_class = defaultdict(int)
total_per_class = defaultdict(int)

with torch.no_grad():
    for images, labels, paths in val_loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        confidences, preds = torch.max(probs, 1)

        for true_label, pred_label, conf, path in zip(labels, preds, confidences, paths):
            c_true = class_names[true_label.item()]
            c_pred = class_names[pred_label.item()]
            total_per_class[c_true] += 1

            if true_label == pred_label:
                correct_per_class[c_true] += 1
            else:
                errors_found += 1
                filename = os.path.basename(path)
                print(f"\n ERROR IN FILE: {filename}")
                print(f"   Path: {path}")
                print(f"   Actual class: {c_true}")
                print(f"   Model predicted:  {c_pred} (confidence: {conf.item()*100:.1f}%)")

print("\n--- ACCURACY PER CATEGORY ---")
for c_name in class_names:
    total = total_per_class[c_name]
    correct = correct_per_class[c_name]
    acc = (correct / total * 100) if total > 0 else 0.0
    print(f"Class '{c_name}': {correct}/{total} correct ({acc:.1f}%)")

if errors_found == 0:
    print("\n NO ERRORS! The model got 100% of the test samples right.")
print("="*70 + "\n")

MODEL_PATH = "surface_model.pth"
torch.save({
    "model_state_dict": model.state_dict(),
    "class_names": class_names,
    "category_scores": CATEGORY_SCORES
}, MODEL_PATH)
print(f"Model successfully saved as: '{MODEL_PATH}'")
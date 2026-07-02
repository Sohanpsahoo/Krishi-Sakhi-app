# 🌾 Crop Recommendation ML Model

A FastAPI-based machine learning service that recommends the most suitable crop
based on soil nutrients, weather conditions, and geographic location.

---

## 📁 Directory Structure

```
ml/
├── api.py              # FastAPI application (main entry point)
├── crop_model.pkl      # Trained ML classifier (scikit-learn)
├── crop_encoder.pkl    # Label encoder for crop names
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

---

## 🧠 Model Overview

| Property        | Details                              |
|-----------------|--------------------------------------|
| Algorithm       | Random Forest / scikit-learn         |
| Input Features  | 7 (N, P, K, temperature, humidity, pH, rainfall) |
| Output          | Crop label + confidence score        |
| Crops Supported | 22 crop classes                      |
| Fallback Mode   | Rule-based predictor (no .pkl needed)|

---

## 📥 Input Features

| Feature       | Description                  | Unit   | Range     |
|---------------|------------------------------|--------|-----------|
| `N`           | Nitrogen content in soil     | kg/ha  | 0 – 140   |
| `P`           | Phosphorous content in soil  | kg/ha  | 0 – 145   |
| `K`           | Potassium content in soil    | kg/ha  | 0 – 205   |
| `temperature` | Ambient temperature          | °C     | 0 – 55    |
| `humidity`    | Relative humidity            | %      | 0 – 100   |
| `ph`          | Soil pH level                | –      | 0 – 14    |
| `rainfall`    | Annual rainfall              | mm     | 0 – 300   |

### Optional Location Fields

| Field                 | Description                        | Default   |
|-----------------------|------------------------------------|-----------|
| `city`                | Nearest city name                  | "Unknown" |
| `state`               | State / province                   | "Unknown" |
| `country`             | Country                            | "India"   |
| `lat`                 | Latitude                           | 0.0       |
| `lon`                 | Longitude                          | 0.0       |
| `weather_description` | Weather condition (from OWM API)   | ""        |

---

## 📤 Output

```json
{
  "recommended_crop": "rice",
  "confidence": 0.8923,
  "top3": [
    { "crop": "rice",     "confidence": 0.8923 },
    { "crop": "maize",    "confidence": 0.0621 },
    { "crop": "cotton",   "confidence": 0.0312 }
  ],
  "model_context": {
    "soil": {
      "nitrogen_kg_ha": 90,
      "phosphorous_kg_ha": 42,
      "potassium_kg_ha": 43,
      "ph": 6.5
    },
    "weather": {
      "temperature_c": 28,
      "humidity_pct": 72,
      "rainfall_mm": 180,
      "description": "light rain"
    },
    "location": {
      "city": "Bhopal",
      "state": "Madhya Pradesh",
      "country": "India",
      "lat": 23.2599,
      "lon": 77.4126
    },
    "ml_recommendations": [
      { "rank": 1, "crop": "rice",   "confidence": 0.8923, "confidence_pct": "89.2%" },
      { "rank": 2, "crop": "maize",  "confidence": 0.0621, "confidence_pct": "6.2%"  },
      { "rank": 3, "crop": "cotton", "confidence": 0.0312, "confidence_pct": "3.1%"  }
    ],
    "primary_crop": "rice",
    "primary_confidence": 0.8923
  }
}
```

---

## 🔁 Fallback Mode

If `crop_model.pkl` or `crop_encoder.pkl` are missing, the API automatically
switches to a **rule-based predictor** using soil and rainfall thresholds.

### Supported Crops in Fallback

`rice` · `wheat` · `maize` · `chickpea` · `cotton` · `sugarcane` ·
`mungbean` · `lentil` · `pomegranate` · `banana` · `grapes` · `mango`

---

## 🚀 Setup & Running

### 1. Install dependencies

```bash
cd ml/
pip install -r requirements.txt
```

### 2. Train and save the model (if `.pkl` files are missing)

```bash
python train.py   # produces crop_model.pkl and crop_encoder.pkl
```

### 3. Start the API server

```bash
# Development (with auto-reload)

uvicorn api:app --host 0.0.0.0 --port 8001 --reload
# Production
uvicorn api:app --host 0.0.0.0 --port 8001 --workers 2
```

---

## 🛠️ API Endpoints

### `GET /health`

Check if the server and model are loaded.

```bash
curl http://localhost:8001/health
```

```json
{ "status": "ok", "model_loaded": true }
```

---

### `POST /predict`

Get crop recommendation from soil + weather + location data.

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "N": 90,
    "P": 42,
    "K": 43,
    "temperature": 28,
    "humidity": 72,
    "ph": 6.5,
    "rainfall": 180,
    "city": "Bhopal",
    "state": "Madhya Pradesh",
    "country": "India",
    "lat": 23.2599,
    "lon": 77.4126,
    "weather_description": "light rain"
  }'
```

---

## 🔗 Integration with Backend

The Node.js backend (`recommendationController.js`) calls this service:

```
POST http://localhost:8001/predict
```

The `model_context` returned is forwarded directly to **Gemini LLM**, which:
1. Validates regional crop suitability
2. Provides location-specific growing advice
3. Suggests nearby markets and sowing windows

```
Farmer Input
     │
     ▼
FastAPI /predict  ──►  ML Model  ──►  model_context
     │                                      │
     │                                      ▼
     │                              Gemini LLM (validates
     │                              region + gives advice)
     │                                      │
     └──────────────────────────────────────▼
                                   Final Recommendation
                                   saved to MongoDB
```

---

## 📦 Requirements

```
fastapi
uvicorn
scikit-learn
numpy
joblib
pydantic
```

Install all:
```bash
pip install -r requirements.txt
```

---

## ⚠️ Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Model files not found` | `.pkl` files missing | Run `python train.py` |
| `422 Unprocessable Entity` | Input out of valid range | Check field ranges in table above |
| `500 Internal Server Error` | Model prediction failed | Check logs, fallback activates automatically |
| Port 8001 already in use | Another process running | `kill $(lsof -t -i:8001)` |

---

## 📊 Model Performance

| Metric    | Score  |
|-----------|--------|
| Accuracy  | ~97%   |
| Precision | ~97%   |
| Recall    | ~97%   |
| F1 Score  | ~97%   |

> Trained on the [Crop Recommendation Dataset](https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset) — 2,200 samples, 22 crop classes.
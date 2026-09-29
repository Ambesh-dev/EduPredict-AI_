from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import io
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
import numpy as np

app = FastAPI(title="EduPredict AI ML API")

FEATURES = ["attendance","assignment_score","internal_score","exam_score","previous_score"]

class PredictIn(BaseModel):
    attendance: float
    assignment_score: float
    internal_score: float
    exam_score: float
    previous_score: float

def models():
    return {
        "Linear Regression": LinearRegression(),
        "Decision Tree": DecisionTreeRegressor(max_depth=5, random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42),
    }

@app.get("/")
def root():
    return {"service":"EduPredict AI ML API","status":"ok"}

@app.post("/train")
async def train(file: UploadFile = File(...)):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV: {e}")

    required = FEATURES + ["target_score"]
    missing = [x for x in required if x not in df.columns]
    if missing:
        raise HTTPException(400, f"Missing columns: {missing}")

    df = df[required].dropna()
    if len(df) < 12:
        raise HTTPException(400, "Use at least 12 rows for a meaningful demo evaluation.")

    X, y = df[FEATURES], df["target_score"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=.2, random_state=42)

    results = []
    for name, model in models().items():
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        results.append({
            "model": name,
            "mae": round(float(mean_absolute_error(y_test, pred)), 3),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, pred))), 3),
            "r2": round(float(r2_score(y_test, pred)), 3),
        })

    selected = min(results, key=lambda x: x["rmse"])
    return {"rows": len(df), "results": results, "selected_model": selected}

@app.post("/predict")
def predict(item: PredictIn):
    # Demo inference: train on a small transparent synthetic mapping.
    # For institutional use, load the model trained from real historical data.
    x = np.array([[item.attendance,item.assignment_score,item.internal_score,item.exam_score,item.previous_score]])
    score = float(np.clip(
        .30*item.attendance + .20*item.assignment_score +
        .25*item.internal_score + .15*item.exam_score +
        .10*item.previous_score, 0, 100
    ))
    risk = "High" if score < 45 else ("Medium" if score < 65 else "Low")
    return {"predicted_score": round(score,2), "risk_level": risk, "model_name":"EduPredict Transparent Baseline"}

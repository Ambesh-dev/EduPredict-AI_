# Optional EduPredict ML API

This backend is optional. The static frontend works without it.

Run:

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

POST `/train` with a CSV file containing:

- attendance
- assignment_score
- internal_score
- exam_score
- previous_score
- target_score

The API evaluates:
- Linear Regression
- Decision Tree
- Random Forest

It returns MAE/RMSE/R2 metrics and the selected model according to lowest RMSE.

POST `/predict` with the five academic input fields.

For production, authenticate the backend and connect it to your database rather than exposing an open training endpoint.

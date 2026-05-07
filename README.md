# Student Performance Predictor

A full-stack web app that trains four scikit-learn classifiers and exposes a clean Flask UI for real-time student pass/fail prediction.

## Folder structure

```
student_predictor/
│
├── backend/
│   ├── __init__.py
│   ├── app.py          ← Flask routes & API
│   └── train.py        ← Model training & persistence
│
├── frontend/
│   ├── templates/
│   │   └── index.html  ← Jinja2 template
│   └── static/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── main.js
│
├── models/
│   └── trained_models.pkl   ← Auto-generated after first run
│
├── data/
│   └── student_performance_3000.csv  ← Place your CSV here
│
├── notebooks/           ← Optional: EDA notebooks
├── requirements.txt
└── README.md
```

## Setup & run

```bash
# 1. Clone / download the project
cd student_predictor

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Place your CSV in data/
cp /path/to/student_performance_3000.csv data/

# 5. (Optional) pre-train models
python backend/train.py

# 6. Run the app
python backend/app.py
```

Open http://localhost:5000 in your browser.

## API endpoints

| Method | Endpoint         | Description                        |
|--------|------------------|------------------------------------|
| GET    | /                | Serves the UI                      |
| GET    | /api/model-info  | Returns model names & accuracies   |
| POST   | /api/predict     | Predicts pass/fail from JSON input |

### POST /api/predict — request body

```json
{
  "study_hours": 6.0,
  "attendance": 75,
  "previous_marks": 65
}
```

### Response

```json
{
  "best_model": "Random Forest",
  "best_result": {
    "prediction": "Pass",
    "probability": 0.83,
    "accuracy": 0.9233
  },
  "results": { ... }
}
```

## Models trained

- Logistic Regression
- Decision Tree (max_depth=5)
- Random Forest (100 estimators)
- SVM (with probability)

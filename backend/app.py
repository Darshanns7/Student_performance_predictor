from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pickle, os, sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from backend.train import train_models

app = Flask(
    __name__,
    template_folder="../frontend/templates",
    static_folder="../frontend/static"
)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/trained_models.pkl")

def load_models():
    if not os.path.exists(MODEL_PATH):
        print("No saved models found — training now...")
        train_models()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

bundle = load_models()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    try:
        study_hours    = float(data["study_hours"])
        attendance     = float(data["attendance"])
        previous_marks = float(data["previous_marks"])
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    import pandas as pd
    FEATURES = ["Study_Hours", "Attendance", "Previous_Marks"]
    X = pd.DataFrame([[study_hours, attendance, previous_marks]], columns=FEATURES)
    X = bundle["imputer"].transform(X)
    X = bundle["scaler"].transform(X)

    results = {}
    best_name = bundle["best_model_name"]

    for name, model in bundle["models"].items():
        prob = model.predict_proba(X)[0][1]
        results[name] = {
            "probability": round(float(prob), 4),
            "prediction": "Pass" if prob >= 0.5 else "Fail",
            "accuracy": round(bundle["accuracies"][name], 4)
        }

    return jsonify({
        "results": results,
        "best_model": best_name,
        "best_result": results[best_name]
    })

@app.route("/api/model-info", methods=["GET"])
def model_info():
    return jsonify({
        "models": list(bundle["models"].keys()),
        "accuracies": {k: round(v, 4) for k, v in bundle["accuracies"].items()},
        "best_model": bundle["best_model_name"]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)

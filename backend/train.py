import os, pickle, warnings
import pandas as pd
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score

FEATURES     = ["Study_Hours", "Attendance", "Previous_Marks"]
TARGET       = "Final_Result"
DATA_PATH    = os.path.join(os.path.dirname(__file__), "../data/student_performance_3000.csv")
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "../models/trained_models.pkl")


def train_models():
    # ── Load & prepare data ──────────────────────────────────────────────────
    df = pd.read_csv(DATA_PATH)
    df[TARGET] = df[TARGET].map({"Pass": 1, "Fail": 0})

    X = df[FEATURES]
    y = df[TARGET]

    # ── Preprocessing ────────────────────────────────────────────────────────
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler   = StandardScaler()
    X_train  = scaler.fit_transform(X_train)
    X_test   = scaler.transform(X_test)

    # ── Train models ─────────────────────────────────────────────────────────
    model_defs = {
        "Logistic Regression": LogisticRegression(max_iter=500),
        "Decision Tree":       DecisionTreeClassifier(max_depth=5),
        "Random Forest":       RandomForestClassifier(n_estimators=100),
        "SVM":                 SVC(probability=True),
    }

    trained, accuracies = {}, {}
    best_model, best_acc, best_name = None, 0, ""

    print("\nTraining models...")
    print("=" * 40)
    for name, mdl in model_defs.items():
        mdl.fit(X_train, y_train)
        acc = accuracy_score(y_test, mdl.predict(X_test))
        trained[name]    = mdl
        accuracies[name] = acc
        print(f"  {name:<22} {acc:.4f}")
        if acc > best_acc:
            best_acc, best_model, best_name = acc, mdl, name

    print(f"\nBest model : {best_name}  ({best_acc:.4f})")

    # ── Persist ──────────────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    bundle = {
        "models":          trained,
        "accuracies":      accuracies,
        "best_model":      best_model,
        "best_model_name": best_name,
        "imputer":         imputer,
        "scaler":          scaler,
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    print(f"Models saved → {MODEL_PATH}\n")
    return bundle


if __name__ == "__main__":
    train_models()

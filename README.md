# 🏙️ NYC Room Type Predictor

Predict whether an NYC Airbnb listing is an **Entire home/apt**, **Private room**, or **Shared room** — based on its location, price, and booking stats. Built on the classic NYC Airbnb Open Data (2019) dataset with a tuned Random Forest pipeline, served through FastAPI, and wrapped in a custom blueprint-themed UI.

**🔗 Live demo:** [nyc-room-type-predictor-1.onrender.com](https://nyc-room-type-predictor-1.onrender.com/)

> Note: the app is hosted on Render's free tier, so the first request after a period of inactivity can take 30–60 seconds while the server spins back up.

---

## ✨ Features

- **End-to-end ML pipeline** — imputation, scaling, one-hot encoding, and a class-balanced Random Forest, all inside a single `sklearn.Pipeline` for consistent preprocessing at inference time.
- **Hyperparameter tuning** via `RandomizedSearchCV`, optimized for macro-F1 to handle class imbalance (Shared Room is a small minority class).
- **FastAPI backend** with Pydantic-validated inputs and a `/predict` endpoint returning both the predicted label and full class probabilities.
- **Custom interactive frontend** — no framework, just HTML/CSS/JS — themed as an architect's blueprint sheet:
  - Borough-aware neighbourhood picker
  - Animated, self-drawing floor-plan SVG that matches the predicted room type
  - Live probability "ruler" scale for all three classes
  - Fully responsive, works on mobile

---

## 🧠 Model

| | |
|---|---|
| **Dataset** | [NYC Airbnb Open Data (2019)](https://www.kaggle.com/datasets/dgomonov/new-york-city-airbnb-open-data) |
| **Target** | `room_type` (Entire home/apt / Private room / Shared room) |
| **Algorithm** | Random Forest Classifier (`class_weight="balanced"`) |
| **Tuning** | `RandomizedSearchCV`, 3-fold CV, scored on macro-F1 |
| **Preprocessing** | Median imputation + `StandardScaler` for numeric features, most-frequent imputation + `OneHotEncoder` for categorical features |
| **Features used** | `latitude`, `longitude`, `price`, `minimum_nights`, `number_of_reviews`, `reviews_per_month`, `calculated_host_listings_count`, `availability_365`, `neighbourhood_group`, `neighbourhood` |

Full data cleaning, EDA, and training steps are in [`Untitled.ipynb`](./Untitled.ipynb).

---

## 🗂️ Project Structure

```
├── main.py               # FastAPI app + /predict endpoint
├── Model_Pipeline.pkl     # Trained sklearn pipeline (preprocessing + model)
├── Untitled.ipynb         # EDA, cleaning, training, and model export
├── index.html             # Frontend UI
├── style.css              # Blueprint theme styling
└── script.js              # Form logic + API calls + animated results
```

---

## ⚙️ Running Locally

**1. Clone the repo**
```bash
git clone https://github.com/mohit-jangraa/<repo-name>.git
cd <repo-name>
```

**2. Set up a virtual environment and install dependencies**
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install fastapi uvicorn scikit-learn pandas joblib
```

**3. Start the API**
```bash
uvicorn main:app --reload
```
The API will run at `http://127.0.0.1:8000`.

**4. Open the frontend**
Just open `index.html` in your browser. By default it points at `http://127.0.0.1:8000` — update `API_BASE` in `script.js` if your backend runs elsewhere (e.g. when pointing it at the deployed Render URL instead of localhost).

---

## 📡 API Reference

### `GET /`
Health check. Returns a simple greeting string.

### `POST /predict`
Predicts the room type for a listing.

**Request body:**
```json
{
  "latitude": 40.7306,
  "longitude": -73.9866,
  "price": 120,
  "minimum_nights": 3,
  "number_of_reviews": 24,
  "reviews_per_month": 1.2,
  "calculated_host_listings_count": 1,
  "availability_365": 180,
  "neighbourhood_group": "Manhattan",
  "neighbourhood": "Harlem"
}
```

**Response:**
```json
{
  "Predicted_room_type": "Entire home/apt",
  "Probability": [0.71, 0.24, 0.05]
}
```
`Probability` follows scikit-learn's default alphabetical class order: `["Entire home/apt", "Private room", "Shared room"]`.

---

## 🛠️ Tech Stack

`Python` · `scikit-learn` · `pandas` · `FastAPI` · `uvicorn` · `HTML/CSS/JavaScript`

---

## 👤 Author

**Mohit Kumar**
- GitHub: [@mohit-jangraa](https://github.com/mohit-jangraa)
- LinkedIn: [mohit-kumar-234a42412](https://linkedin.com/in/mohit-kumar-234a42412)
- Email: itsmohit8396@gmail.com

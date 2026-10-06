import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.transaction import Transaction

from sqlalchemy import func

def detect_anomalies_mad(transactions: List[Transaction]) -> List[Dict[str, Any]]:
    """
    Detects expenditure anomalies using Median Absolute Deviation (MAD).
    MAD = median(|x_i - median(x)|).
    Anomaly score = 0.6745 * |x_i - median| / MAD.
    Scores > 3.0 are flagged as statistically significant anomalies.
    """
    if not transactions or len(transactions) < 3:
        return []
    
    amounts = np.array([float(t.amount) for t in transactions if (t.type or "").lower() == "expense"])
    if len(amounts) < 3:
        return []

    med = np.median(amounts)
    mad = np.median(np.abs(amounts - med))
    if mad == 0:
        mad = 1e-6

    anomalies = []
    for t in transactions:
        if (t.type or "").lower() != "expense":
            continue
        amt = float(t.amount)
        score = 0.6745 * abs(amt - med) / mad
        if score > 3.0:
            anomalies.append({
                "id": t.id,
                "amount": float(t.amount),
                "date": t.date.isoformat() if t.date else None,
                "description": t.description,
                "category": t.category.name if t.category else "Uncategorized",
                "anomaly_score": round(float(score), 2),
                "median_baseline": round(float(med), 2)
            })
    return anomalies

class Forecaster:
    def __init__(self):
        self.use_prophet = False
        try:
            import prophet
            self.use_prophet = True
        except ImportError:
            pass

    def forecast_spending(self, db: Session, user_id: int) -> dict:
        # Fetch expense transactions, strictly excluding internal transfers
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            func.lower(Transaction.type) == "expense"
        ).order_by(Transaction.date.asc()).all()

        anomalies = detect_anomalies_mad(transactions)

        result = {
            "forecast_points": [],
            "metrics": {
                "tomorrow": 0.0,
                "next_week": 0.0,
                "next_month": 0.0,
                "next_quarter": 0.0,
                "expected_savings": 0.0,
                "recommended_budget": 0.0,
                "savings_three_tier": {
                    "conservative": 0.0,
                    "expected": 0.0,
                    "optimistic": 0.0
                }
            },
            "anomalies": anomalies,
            "status": "insufficient_data"
        }

        if len(transactions) < 5:
            return result

        # Convert to pandas DataFrame
        df = pd.DataFrame([{
            "ds": t.date.replace(tzinfo=None),
            "y": float(t.amount)
        } for t in transactions])

        df = df.groupby(df["ds"].dt.date)["y"].sum().reset_index()
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.set_index("ds").resample("D").asfreq().fillna(0).reset_index()

        if len(df) < 5:
            return result

        horizon_days = 90
        future_dates = [df["ds"].max() + timedelta(days=i) for i in range(1, horizon_days + 1)]

        predictions = []
        conf_lower = []
        conf_upper = []

        if self.use_prophet:
            try:
                from prophet import Prophet
                m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
                m.fit(df)
                future = m.make_future_dataframe(periods=horizon_days)
                forecast = m.predict(future)
                future_forecast = forecast.tail(horizon_days)
                predictions = future_forecast["yhat"].tolist()
                conf_lower = future_forecast["yhat_lower"].tolist()
                conf_upper = future_forecast["yhat_upper"].tolist()
            except Exception:
                self.use_prophet = False

        if not self.use_prophet:
            try:
                from sklearn.linear_model import LinearRegression
                df["ordinal"] = df["ds"].apply(lambda x: x.toordinal())
                df["day_of_week"] = df["ds"].dt.dayofweek
                X = df[["ordinal", "day_of_week"]]
                y = df["y"]
                model = LinearRegression()
                model.fit(X, y)

                future_df = pd.DataFrame({"ds": future_dates})
                future_df["ordinal"] = future_df["ds"].apply(lambda x: x.toordinal())
                future_df["day_of_week"] = future_df["ds"].dt.dayofweek
                predictions = model.predict(future_df[["ordinal", "day_of_week"]])
                predictions = np.clip(predictions, 0, None).tolist()

                residuals = y - model.predict(X)
                std_error = float(np.std(residuals))
                conf_lower = [max(0.0, p - 1.96 * std_error) for p in predictions]
                conf_upper = [p + 1.96 * std_error for p in predictions]
            except Exception:
                return result

        forecast_points = []
        for i, dt in enumerate(future_dates):
            forecast_points.append({
                "date": dt.strftime("%Y-%m-%d"),
                "predicted": round(predictions[i], 2),
                "lower": round(conf_lower[i], 2),
                "upper": round(conf_upper[i], 2)
            })

        result["forecast_points"] = forecast_points
        tomorrow_est = predictions[0]
        next_week_est = sum(predictions[:7])
        next_month_est = sum(predictions[:30])
        next_quarter_est = sum(predictions[:90])

        last_month = datetime.now() - timedelta(days=30)
        income_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            func.lower(Transaction.type) == "income",
            Transaction.date >= last_month
        ).all()
        monthly_income = sum(float(t.amount) for t in income_transactions)

        if monthly_income <= 0:
            # Fallback to all-time average monthly income from real transactions
            all_income_sum = float(db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                func.lower(Transaction.type) == "income"
            ).scalar() or 0.0)
            first_income_tx = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                func.lower(Transaction.type) == "income"
            ).order_by(Transaction.date.asc()).first()
            if first_income_tx and all_income_sum > 0:
                f_date = first_income_tx.date.replace(tzinfo=None) if first_income_tx.date.tzinfo else first_income_tx.date
                days_span = max((datetime.now() - f_date).days, 15)
                monthly_income = (all_income_sum / days_span) * 30.0
            else:
                monthly_income = 0.0

        daily_std = float(np.std(df["y"])) if len(df["y"]) > 1 else 0.0
        monthly_std = daily_std * np.sqrt(30)

        conservative_savings = max(0.0, monthly_income - (next_month_est + 1.645 * monthly_std))
        expected_savings = max(0.0, monthly_income - next_month_est)
        optimistic_savings = max(0.0, monthly_income - max(0.0, next_month_est - 1.645 * monthly_std))

        recommended_budget = max(0.0, next_month_est * 0.9) if next_month_est > 0 else 0.0

        result["metrics"] = {
            "tomorrow": round(tomorrow_est, 2),
            "next_week": round(next_week_est, 2),
            "next_month": round(next_month_est, 2),
            "next_quarter": round(next_quarter_est, 2),
            "expected_savings": round(expected_savings, 2),
            "recommended_budget": round(recommended_budget, 2),
            "savings_three_tier": {
                "conservative": round(conservative_savings, 2),
                "expected": round(expected_savings, 2),
                "optimistic": round(optimistic_savings, 2)
            }
        }
        result["status"] = "success"
        return result

forecaster = Forecaster()

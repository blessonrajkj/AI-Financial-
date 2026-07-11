import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.transaction import Transaction

class Forecaster:
    def __init__(self):
        self.use_prophet = False
        try:
            import prophet
            self.use_prophet = True
        except ImportError:
            print("Prophet library not found. Falling back to Scikit-Learn Linear Regression for forecasting.")

    def forecast_spending(self, db: Session, user_id: int) -> dict:
        # Fetch expense transactions
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense"
        ).order_by(Transaction.date.asc()).all()

        result = {
            "forecast_points": [],
            "metrics": {
                "tomorrow": 0.0,
                "next_week": 0.0,
                "next_month": 0.0,
                "next_quarter": 0.0,
                "expected_savings": 0.0,
                "recommended_budget": 0.0
            },
            "status": "insufficient_data"
        }

        if len(transactions) < 10:
            return result

        # Convert to pandas DataFrame
        df = pd.DataFrame([{
            "ds": t.date.replace(tzinfo=None),
            "y": t.amount
        } for t in transactions])

        # Aggregate by day
        df = df.groupby(df["ds"].dt.date).sum().reset_index()
        df["ds"] = pd.to_datetime(df["ds"])

        # Reindex to fill missing days with 0
        df = df.set_index("ds").resample("D").asfreq().fillna(0).reset_index()

        if len(df) < 7:
            return result

        # Determine forecasting horizon
        horizon_days = 90
        future_dates = [df["ds"].max() + timedelta(days=i) for i in range(1, horizon_days + 1)]
        
        predictions = []
        conf_lower = []
        conf_upper = []

        if self.use_prophet:
            try:
                from prophet import Prophet
                m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
                # Prophet expects df with columns 'ds' and 'y'
                m.fit(df)
                
                future = m.make_future_dataframe(periods=horizon_days)
                forecast = m.predict(future)
                
                # Fetch future predictions
                future_forecast = forecast.tail(horizon_days)
                predictions = future_forecast["yhat"].tolist()
                conf_lower = future_forecast["yhat_lower"].tolist()
                conf_upper = future_forecast["yhat_upper"].tolist()
            except Exception as e:
                print(f"Prophet forecast failed, falling back to Scikit-Learn: {e}")
                self.use_prophet = False

        if not self.use_prophet:
            try:
                from sklearn.linear_model import LinearRegression
                # Basic features: ordinal date, day of week
                df["ordinal"] = df["ds"].apply(lambda x: x.toordinal())
                df["day_of_week"] = df["ds"].dt.dayofweek
                
                # Fit linear model
                X = df[["ordinal", "day_of_week"]]
                y = df["y"]
                
                model = LinearRegression()
                model.fit(X, y)
                
                # Predict
                future_df = pd.DataFrame({"ds": future_dates})
                future_df["ordinal"] = future_df["ds"].apply(lambda x: x.toordinal())
                future_df["day_of_week"] = future_df["ds"].dt.dayofweek
                
                predictions = model.predict(future_df[["ordinal", "day_of_week"]])
                # Enforce lower bound of 0 for predicted spend
                predictions = np.clip(predictions, 0, None).tolist()
                
                # Confidence interval based on residual standard deviation
                residuals = y - model.predict(X)
                std_error = np.std(residuals)
                
                conf_lower = [max(0.0, p - 1.96 * std_error) for p in predictions]
                conf_upper = [p + 1.96 * std_error for p in predictions]
            except Exception as e:
                print(f"LinearRegression forecasting failed: {e}")
                return result

        # Compile results
        forecast_points = []
        for i, dt in enumerate(future_dates):
            forecast_points.append({
                "date": dt.strftime("%Y-%m-%d"),
                "predicted": round(predictions[i], 2),
                "lower": round(conf_lower[i], 2),
                "upper": round(conf_upper[i], 2)
            })

        result["forecast_points"] = forecast_points

        # Aggregate spending estimates
        tomorrow_est = predictions[0]
        next_week_est = sum(predictions[:7])
        next_month_est = sum(predictions[:30])
        next_quarter_est = sum(predictions[:90])

        # Compute savings recommendations
        # Assume user's monthly income is the sum of income transactions in the last month
        last_month = datetime.now() - timedelta(days=30)
        income_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.date >= last_month
        ).all()
        monthly_income = sum(t.amount for t in income_transactions) or 3000.0 # Default fallback income

        expected_savings = max(0.0, monthly_income - next_month_est)
        recommended_budget = max(500.0, next_month_est * 0.9)  # Suggest a 10% budget tightening

        result["metrics"] = {
            "tomorrow": round(tomorrow_est, 2),
            "next_week": round(next_week_est, 2),
            "next_month": round(next_month_est, 2),
            "next_quarter": round(next_quarter_est, 2),
            "expected_savings": round(expected_savings, 2),
            "recommended_budget": round(recommended_budget, 2)
        }
        result["status"] = "success"

        return result

forecaster = Forecaster()

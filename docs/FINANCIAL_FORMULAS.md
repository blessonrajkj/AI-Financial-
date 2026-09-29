# PariView Financial Engineering & Mathematical Specifications

**Version:** 2.0-Hardened  
**Date:** September 2026  

---

## 1. Monetary Precision & Arithmetic Standards

All monetary representations in PariView strictly adhere to arbitrary-precision fixed-point arithmetic using SQL `Numeric(12, 2)` (amounts) / `Numeric(14, 4)` (quantity & asset prices) and Python `decimal.Decimal`.

### Arithmetic Rules
1. **No Floating-Point Operations on Currency**: Native IEEE 754 floating-point types are forbidden for monetary balance accumulation or transaction totals.
2. **Rounding Convention**: Financial rounding defaults to `ROUND_HALF_UP` to two decimal places for currency outputs.
3. **Consolidated Net Worth Equation**:
   $$\text{Total Net Worth} = \sum \text{Account Balances} + \sum \text{Investment Portfolios} - \sum \text{Remaining Liabilities}$$

---

## 2. Internal Transfers Engine

Internal account-to-account transfers move principal between user accounts linked via a `transfer_id`.

$$\text{Source Account Balance}_{\text{new}} = \text{Source Account Balance}_{\text{old}} - \text{Transfer Amount}$$
$$\text{Destination Account Balance}_{\text{new}} = \text{Destination Account Balance}_{\text{old}} + \text{Transfer Amount}$$

### Income & Expense Analytics Exclusion Rule
Transactions marked with `type = "transfer"` are strictly excluded from Net Income and Total Expense aggregates:
$$\text{Net Cash Flow} = \sum_{t \in \text{Income}} \text{Amount}_t - \sum_{t \in \text{Expense}} \text{Amount}_t \quad (\forall t: \text{type}_t \neq \text{"transfer"})$$

---

## 3. Anomaly Detection Engine (Median Absolute Deviation)

PariView utilizes **Median Absolute Deviation (MAD)** for robust, outlier-resistant anomaly detection.

### Mathematical Formulation
Given expenditure series $X = \{x_1, x_2, \dots, x_n\}$:

$$\tilde{x} = \text{median}(X)$$
$$\text{MAD} = \text{median}\Big(|x_i - \tilde{x}|\Big)$$

The modified Z-score $M_i$ for each expenditure is:
$$M_i = \frac{0.6745 \cdot |x_i - \tilde{x}|}{\text{MAD}}$$

Transactions with $M_i > 3.0$ are classified as statistically significant expenditure anomalies.

---

## 4. 3-Tier Statistical Savings Forecasting Engine

PariView forecasts future savings using a 3-tier probabilistic model incorporating variance and standard deviation bounds ($\sigma$).

### Model Specifications
Given monthly net income $I$ and expected monthly expenditure mean $\mu_E$ with standard deviation $\sigma_E$:

1. **Conservative Savings Forecast** (90% Confidence Lower Bound):
   $$S_{\text{conservative}} = \max\Big(0, \, I - (\mu_E + 1.645 \cdot \sigma_E)\Big)$$

2. **Expected Savings Forecast** (Mean Projection):
   $$S_{\text{expected}} = \max\Big(0, \, I - \mu_E\Big)$$

3. **Optimistic Savings Forecast** (90% Confidence Upper Bound):
   $$S_{\text{optimistic}} = \max\Big(0, \, I - \max(0, \mu_E - 1.645 \cdot \sigma_E)\Big)$$

---

## 5. India Post Investments & Compounding Rate Engine

Official formulas applied for India Post government savings schemes:

### A. Public Provident Fund (PPF) & Sukanya Samriddhi Yojana (SSY)
Interest compounded annually at financial year end (March 31):
$$A = P \cdot \left(1 + \frac{r}{100}\right)^t$$

### B. Post Office Time Deposit (POTD)
Interest calculated quarterly compound, paid annually:
$$A = P \cdot \left(1 + \frac{r/100}{4}\right)^{4t}$$

### C. Monthly Income Scheme (MIS)
Monthly simple interest payout:
$$\text{Monthly Payout} = \frac{P \cdot (r/100)}{12}$$

### D. Senior Citizen Savings Scheme (SCSS)
Quarterly simple interest payout:
$$\text{Quarterly Payout} = \frac{P \cdot (r/100)}{4}$$

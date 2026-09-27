<div align="center">

# AI Financial Assistant

### Intelligent Personal Finance Management Powered by Artificial Intelligence

*A modern full-stack platform that helps users manage expenses, monitor investments, detect fraud, forecast finances, and make smarter financial decisions through AI.*

<p>

<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/AI-Powered-success?style=for-the-badge"/>
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge"/>

</p>

<p>

<a href="https://github.com/blessonrajkj/AI-Financial-">
<img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github">
</a>

</p>

---

### **Manage • Analyze • Invest • Forecast • Grow**

</div>

---

# Overview

AI Financial Assistant is a comprehensive full-stack personal finance platform designed to simplify financial management through the power of Artificial Intelligence.

The application combines budgeting, expense tracking, investment monitoring, fraud detection, financial forecasting, OCR receipt scanning, voice-assisted transactions, and AI-driven financial recommendations into one seamless ecosystem.

Whether you want to understand your spending habits, build better budgets, manage investments, or receive intelligent financial insights, AI Financial Assistant provides an intuitive and data-driven experience.

---

# Why AI Financial Assistant?

Managing personal finances often requires multiple applications for budgeting, banking, investments, subscriptions, and analytics.

AI Financial Assistant unifies these capabilities into a single intelligent platform that enables users to:

* Track daily income and expenses
* Visualize spending patterns
* Monitor investment portfolios
* Scan receipts automatically
* Detect suspicious transactions
* Forecast future expenses
* Receive AI-powered financial guidance
* Manage subscriptions and savings goals

---

# Core Features

## AI Financial Advisor

Receive intelligent financial recommendations based on your spending behavior, budgeting patterns, and investment activities.

---

## Expense Management

* Add transactions
* Edit expenses
* Delete records
* Expense categorization
* Income tracking
* Smart filtering
* Search transactions
* Monthly summaries

---

## Interactive Dashboard

Visualize your finances through dynamic charts and analytics.

Features include:

* Income vs Expense
* Spending Categories
* Monthly Reports
* Cash Flow Analysis
* Financial Health Overview

---

## Investment Portfolio

Track investments with ease.

* Portfolio Overview
* Investment Tracking
* Asset Allocation
* Investment Performance
* Wealth Growth Analysis

---

## Budget Planning

Create budgets and monitor your financial discipline.

* Monthly Budgets
* Spending Alerts
* Budget Progress
* Category Limits

---

## Savings Goals

Plan your financial future.

* Create Goals
* Track Progress
* Completion Status
* Goal Analytics

---

## OCR Receipt Scanner

Digitize receipts instantly.

* Automatic OCR
* Merchant Detection
* Amount Extraction
* Expense Creation
* Receipt History

---

## Voice Transactions

Log expenses using natural language.

Examples:

> "Spent ₹350 on groceries"

> "Paid ₹1500 for electricity"

The system automatically converts voice into transactions.

---

## UPI Payment Scanner

Extract payment information from UPI screenshots and simplify expense logging.

---

## AI Fraud Detection

Automatically identify unusual or suspicious financial activities.

Features include:

* Anomaly Detection
* Risk Analysis
* Suspicious Spending Alerts

---

## Financial Forecasting

Predict future expenses and cash flow using AI-driven forecasting models.

---

## Subscription Management

Never miss recurring payments.

Track:

* OTT Services
* Software Subscriptions
* Utility Bills
* Memberships

---

## Authentication

Secure user authentication with protected routes and profile management.

---

# Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* React Router
* Axios
* React Query
* Recharts
* XLSX

---

## Backend

* FastAPI
* Python
* SQLAlchemy
* Pydantic
* REST APIs

---

## AI Modules

* AI Financial Assistant
* OCR Engine
* Voice Processing
* Fraud Detection
* Forecasting Models
* Smart Categorization

---

## Database

* SQLite
* PostgreSQL (Production Ready)

---

# System Architecture

```text
                 User

                  │

         React + Vite Frontend

                  │

        REST API Communication

                  │

               FastAPI

      ┌─────────┼──────────┐

      │         │          │

 AI Services  Database  Authentication

      │         │          │

 OCR • NLP • Forecast • Fraud Detection
```

---

# Project Structure

```text
AI-Financial/

├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── layouts/
│   │   ├── assets/
│   │   └── App.jsx
│   │
│   ├── public/
│   └── package.json
│
├── screenshots/
│
└── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/blessonrajkj/AI-Financial-.git
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

source venv/bin/activate
```

Windows

```bash
venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Start server

```bash
uvicorn app.main:app --reload
```

Backend

```
http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend

```
http://localhost:5173
```

---

# Screenshots

Add screenshots inside

```
screenshots/
```

Suggested screenshots:

* Dashboard
* Analytics
* Expense Tracker
* AI Chat
* OCR Scanner
* Investment Portfolio
* Budget Planner
* Forecast Dashboard

---

# Future Roadmap

* Stock Market Integration
* Mutual Fund Tracking
* Cryptocurrency Dashboard
* AI Budget Planner
* Tax Calculator
* Email Notifications
* Mobile Application
* Dark Mode
* Multi-language Support
* Cloud Deployment
* Real-time Market Data
* Banking API Integration

---

# Automated Quality & CI/CD Pipeline

PariView uses a multi-stage GitHub Actions automated quality control pipeline triggered on push to `master`/`main`/`dev` and pull requests.

```
Git Push / PR
    ↓
GitHub Actions CI
    ├── Stage A: Backend Static Compilation & Linting
    ├── Stage B & C & D: PostgreSQL DB, Alembic Migrations & Pytest (29 tests)
    ├── Stage E: Frontend Production Build Validation
    ├── Stage F & G & H & K: Fixtures, Health Check & Playwright E2E (6 tests)
    ├── Stage I & J & K: Secret Scan, Dependency Audit & Docker Build
    └── Stage M: CI Results Summary
    ↓
PASS → Production Manual Approval Gate
```

## Local Testing Commands

Developers can run the full local CI equivalent suite before pushing:

### Windows (PowerShell - Primary Dev Environment):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
```

### Windows (CMD Batch):
```cmd
scripts\test-all.bat
```

### Linux / macOS / Git Bash:
```bash
chmod +x scripts/test-all.sh
./scripts/test-all.sh
```

## Environment Variables Configuration

Copy `.env.example` to `.env` in the root and backend directories:

```ini
# Database & Core
DATABASE_URL=postgresql://pariview:pariviewpassword@localhost:5432/pariview
SECRET_KEY=your_super_secret_jwt_key_min_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=11520

# Application
PROJECT_NAME="PariView AI Financial Assistant"
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Optional AI Features
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note**: Never commit actual credentials or `.env` files to git.

## Production Readiness & Deployment Safety

- Detailed checklist: [docs/PRODUCTION_READINESS.md](file:///d:/BLESSON%20RAJ/PRO/Finacial%20tracker/docs/PRODUCTION_READINESS.md)
- CI/CD Architecture doc: [docs/CI_CD.md](file:///d:/BLESSON%20RAJ/PRO/Finacial%20tracker/docs/CI_CD.md)
- **Deployment Safety**: Automatic production deployment is disabled. Passing CI enables manual approval for production deployment.

---

# Contributing

Contributions are welcome.

1. Fork the repository

2. Create a new branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Added new feature"
```

4. Push branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# Author

## Blesson Raj K J

**AI & Machine Learning Enthusiast**

GitHub

https://github.com/blessonrajkj

LinkedIn

https://linkedin.com/in/blesson-raj

Email

[blessonrajkj200720@gmail.com](mailto:blessonrajkj200720@gmail.com)

---

# Acknowledgements

Special thanks to the open-source community and the developers behind FastAPI, React, Tailwind CSS, Vite, SQLAlchemy, and the AI technologies that inspired this project.

---

# Disclaimer

This software is intended for educational, research, and demonstration purposes only.

The AI-generated insights are informational and should not be considered professional financial, legal, or investment advice. Always conduct independent research before making financial decisions.

---

# License

This project is licensed under the MIT License.

See the LICENSE file for more information.

---

<div align="center">

### ⭐ Star this repository if you found it helpful!

**Building the future of intelligent personal finance with Artificial Intelligence.**

Made with ❤️ by **Blesson Raj K J**

</div>

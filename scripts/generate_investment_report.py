import os
import sys
import shutil
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
import fitz

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#4F46E5"))
            self.drawString(36, 762, "PARIVIEW WEALTH & INVESTMENT ENGINE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(225, 762, "|  Deep Architecture, Ledger Mechanics & Mathematical Guide")
            self.drawRightString(576, 762, "OFFICIAL TECHNICAL REPORT")
            
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(36, 754, 576, 754)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(36, 45, 576, 45)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(36, 32, "PariView Wealth Management OS")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(185, 32, "|   Multi-Lot Accounting, Sovereign Schemes & Compound Forecasting")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 32, page_str)
        self.restoreState()


def create_callout(text, title="KEY ARCHITECTURAL HIGHLIGHT", border_color="#4F46E5", bg_color="#EEF2FF", text_color="#1E293B"):
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CalloutTitle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor(border_color)
    )
    body_style = ParagraphStyle(
        'CalloutBody',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor(text_color)
    )
    content = [
        Paragraph(f"<b>{title}</b>", title_style),
        Spacer(1, 2),
        Paragraph(text, body_style)
    ]
    t = Table([[content]], colWidths=[540])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
    ]))
    return t


def generate_investment_pdf(pdf_path):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=21,
        leading=25,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=3
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=10
    )
    h1_style = ParagraphStyle(
        'H1',
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor('#4F46E5'),
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'H2',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=2
    )
    formula_style = ParagraphStyle(
        'Formula',
        fontName='Courier-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        backColor=colors.HexColor('#F1F5F9'),
        borderColor=colors.HexColor('#CBD5E1'),
        borderWidth=0.5,
        borderPadding=4,
        spaceBefore=2,
        spaceAfter=4
    )
    th_style = ParagraphStyle(
        'TH',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )
    td_style = ParagraphStyle(
        'TD',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )
    td_bold_style = ParagraphStyle(
        'TDBold',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0F172A')
    )
    badge_green = ParagraphStyle(
        'BadgeGreen',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#065F46')
    )

    story = []

    # ==========================================
    # HEADER / TITLE
    # ==========================================
    story.append(Paragraph("PARIVIEW WEALTH & INVESTMENT ENGINE", title_style))
    story.append(Paragraph("<b>Comprehensive Architecture & Operational Guide</b> | Multi-Lot Accounting, Sovereign Schemes & Compound Forecasting", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#4F46E5'), spaceAfter=8, spaceBefore=0))

    # Metadata Grid
    meta_data = [
        [
            Paragraph("<b>Module:</b> Wealth & Investment Portfolio", td_style),
            Paragraph("<b>Core Accounting:</b> Multi-Lot WAC Ledger", td_style),
            Paragraph("<b>Precision:</b> Numeric(14, 4) Financial Math", td_style)
        ],
        [
            Paragraph("<b>Sovereign Integration:</b> India Post (PPF/SSA/NSC)", td_style),
            Paragraph("<b>Market Feeds:</b> NSE, BSE, Yahoo Finance", td_style),
            Paragraph("<b>Forecasting:</b> 1-30 Year Compound Engine", td_style)
        ],
        [
            Paragraph("<b>Backend Endpoints:</b> /api/v1/investments", td_style),
            Paragraph("<b>Mobile UI:</b> True Viewport Bottom Sheets", td_style),
            Paragraph("<b>Verification:</b> Automated PyTest Suite Passed", badge_green)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[180, 180, 180])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    story.append(create_callout(
        "The PariView Wealth Engine is designed as a true financial ledger. Rather than treating an investment "
        "as a flat static balance, PariView implements a relational multi-lot architecture: ONE Holding aggregates "
        "MANY chronological Buy, Sell, and Dividend transactions. It enforces Weighted Average Cost (WAC) basis, "
        "automatic duplicate holding prevention, real-time unrealized and realized P&L calculations, "
        "seamless integration with Indian sovereign post office instruments, and dynamic compound wealth forecasting.",
        title="CORE PRINCIPLE: TRUE RELATIONAL FINANCIAL LEDGER"
    ))
    story.append(Spacer(1, 8))

    # ==========================================
    # SECTION 1: HOW THE INVESTMENT ENGINE WORKS
    # ==========================================
    story.append(Paragraph("1. How the Investment Engine Works: Complete Lifecycle Walkthrough", h1_style))
    story.append(Paragraph(
        "The investment system coordinates between user input, relational database models, mathematical ledger services, "
        "and market data feeds through a structured 7-stage workflow:",
        body_style
    ))

    stages = [
        ("Stage 1: Asset Ingestion & Duplicate Holding Detection",
         "When a user logs a new asset purchase (Stock, Mutual Fund, Crypto, Gold, ETF), the backend invokes "
         "<code>find_matching_investment()</code>. It normalizes asset symbols, names, and asset groups (e.g., Stocks/ETFs/Crypto "
         "vs. Mutual Funds/SIPs). If the security is already owned (e.g. user buys 5 more shares of HDFC Bank), "
         "the system prevents duplicate holdings and automatically routes the purchase as a new BUY lot under the existing holding."),

        ("Stage 2: Buy Lot Execution & Weighted Average Cost Basis (WAC)",
         "Upon adding a BUY transaction, the ledger service calculates the updated cumulative position and weighted average price. "
         "The formula aggregates the historical cost basis with the new lot's capital outlay: "
         "<br/><code>New_Qty = Old_Qty + Buy_Qty</code>"
         "<br/><code>New_Cost = (Old_Qty * Old_Avg_Price) + (Buy_Qty * Buy_Price)</code>"
         "<br/><code>New_Avg_Price = New_Cost / New_Qty</code>"
         "<br/>The aggregate holding is refreshed, and an immutable <code>InvestmentTransaction</code> record is written to disk."),

        ("Stage 3: Sell Lot Execution & Realized Gain/Loss Accounting",
         "When a user sells units, the system checks whether <code>Sell_Qty <= Current_Qty</code>. "
         "The cost of the sold units is evaluated using the holding's Weighted Average Cost Basis: "
         "<br/><code>Proceeds = Sell_Qty * Sell_Price</code>"
         "<br/><code>Cost_Basis_Sold = Sell_Qty * Avg_Purchase_Price</code>"
         "<br/><code>Realized_P&L = Proceeds - Cost_Basis_Sold</code>"
         "<br/>The remaining holding units decrease by <code>Sell_Qty</code>, the average purchase price per remaining unit remains unchanged, "
         "and the realized gain/loss is stamped in the transaction audit notes."),

        ("Stage 4: Dividend Collection & Yield Tracking",
         "Dividends are logged as income-producing investment transactions with 0 units. "
         "The total dividend amount increments <code>Investment.dividends_received</code>, contributing directly to the holding's "
         "total return and approximate XIRR without altering the holding's purchase price or unit quantity."),

        ("Stage 5: Live Market Pricing & Performance Calculations",
         "When the user views the portfolio, the backend triggers <code>market_data_service.update_prices_for_user()</code>. "
         "Equities and mutual funds query live market quotes (NSE/BSE/Yahoo Finance). To maintain instantaneous UI responsiveness, "
         "price updates are throttled (refreshed at safe intervals) and gracefully fall back to cached prices if external APIs are unreachable. "
         "Unrealized P&L, percentage return, today's P&L (versus previous close), and CAGR are computed dynamically."),

        ("Stage 6: Sovereign Scheme Integration (India Post / PPF)",
         "Sovereign government savings schemes (PPF, Sukanya Samriddhi Yojana, NSC, SCSS, Time Deposits) are integrated "
         "into the wealth engine. The portfolio summary aggregates both market assets and sovereign deposits into a single "
         "<b>Grand Total Wealth</b> balance, and provides Section 80C tax deduction optimization alerts."),

        ("Stage 7: Compound Wealth Forecaster Simulation",
         "The frontend runs mathematical compounding simulations modeling future corpus based on current total portfolio value, "
         "monthly SIP contribution rate, target CAGR, and time horizon (1-30 years), rendering an interactive dual-line area chart.")
    ]

    for title, desc in stages:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    # story.append(PageBreak())

    # ==========================================
    # SECTION 2: MATHEMATICAL FORMULAS & INVARIANTS
    # ==========================================
    story.append(Paragraph("2. Financial Mathematics & Ledger Invariant Formulas", h1_style))
    story.append(Paragraph(
        "PariView adheres to rigorous institutional accounting standards. All calculations are executed in Python "
        "using <code>Decimal</code> and persisted in PostgreSQL using <code>Numeric(14, 4)</code> to eliminate floating-point drift.",
        body_style
    ))

    formulas = [
        ("Weighted Average Cost Basis (WAC) on Buy:",
         "WAC_new = [(Q_old * P_old) + (Q_buy * P_buy)] / (Q_old + Q_buy)"),
        
        ("Realized Gain / Loss on Sell:",
         "Realized_Gain = (Q_sell * P_sell) - (Q_sell * WAC_holding)"),
        
        ("Unrealized Profit & Loss (P&L):",
         "Current_Value = Q_holding * Current_Market_Price\n"
         "Invested_Cost = Q_holding * WAC_purchase_price\n"
         "Unrealized_P&L = Current_Value - Invested_Cost\n"
         "Return_% = (Unrealized_P&L / Invested_Cost) * 100"),
        
        ("Intraday Gain / Loss (Today's P&L):",
         "Today_P&L = Q_holding * (Current_Market_Price - Previous_Close_Price)"),
        
        ("Compound Annual Growth Rate (CAGR):",
         "Years = max(Holding_Days / 365.25, 0.08)\n"
         "CAGR = [(Current_Value / Invested_Cost) ^ (1 / Years) - 1] * 100"),
        
        ("Extended Return with Dividends (Approx XIRR):",
         "Total_Return_Corpus = Current_Value + Total_Dividends_Received\n"
         "XIRR_approx = [(Total_Return_Corpus / Invested_Cost) ^ (1 / Years) - 1] * 100"),
        
        ("Compound Wealth Forecaster Formula:",
         "Monthly_Rate = (CAGR / 100) / 12\n"
         "Balance_0 = Current_Portfolio_Value\n"
         "Balance_m = Balance_(m-1) * (1 + Monthly_Rate) + Monthly_SIP_Contribution"),
        
        ("Portfolio Risk Score (Weighted Average):",
         "Portfolio_Risk = [Sum(Risk_Score_i * Value_i)] / Total_Current_Value\n"
         "Scores: Stocks=7, Crypto=9, Mutual Funds=4, ETFs=3, Gold=2, Bonds=2, PPF/FD=1")
    ]

    for title, formula in formulas:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(formula.replace("\n", "<br/>"), formula_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 6))

    # ==========================================
    # SECTION 3: RELATIONAL DATABASE SCHEMA
    # ==========================================
    story.append(Paragraph("3. Relational Database Schema & Data Models", h1_style))
    story.append(Paragraph(
        "The investment engine is anchored on two normalized tables with foreign key cascades and indexes:",
        body_style
    ))

    db_schema = [
        [Paragraph("Table / Column", th_style), Paragraph("SQL Type", th_style), Paragraph("Constraints & Description", th_style)],
        [
            Paragraph("<b>investments</b>.id", td_bold_style),
            Paragraph("INTEGER", td_style),
            Paragraph("Primary Key, Auto-increment, Indexed", td_style)
        ],
        [
            Paragraph("<b>investments</b>.user_id", td_bold_style),
            Paragraph("INTEGER", td_style),
            Paragraph("Foreign Key &rarr; users.id (ON DELETE CASCADE), Indexed", td_style)
        ],
        [
            Paragraph("<b>investments</b>.asset_name", td_bold_style),
            Paragraph("VARCHAR", td_style),
            Paragraph("Name of the asset (e.g. HDFC Bank, Bitcoin, Mirae Asset Fund)", td_style)
        ],
        [
            Paragraph("<b>investments</b>.asset_type", td_bold_style),
            Paragraph("VARCHAR", td_style),
            Paragraph("Classification: Stocks, Mutual Funds, SIPs, ETFs, Crypto, Gold, Bonds", td_style)
        ],
        [
            Paragraph("<b>investments</b>.symbol / exchange", td_bold_style),
            Paragraph("VARCHAR", td_style),
            Paragraph("Ticker symbol (e.g. HDFCBANK.NS, BTC-USD) and Exchange (NSE, BSE, NASDAQ)", td_style)
        ],
        [
            Paragraph("<b>investments</b>.quantity", td_bold_style),
            Paragraph("NUMERIC(14, 4)", td_style),
            Paragraph("Active cumulative units held. Recalculated on every lot event.", td_style)
        ],
        [
            Paragraph("<b>investments</b>.purchase_price", td_bold_style),
            Paragraph("NUMERIC(14, 4)", td_style),
            Paragraph("Current Weighted Average Cost Basis (WAC) per unit.", td_style)
        ],
        [
            Paragraph("<b>investments</b>.current_price", td_bold_style),
            Paragraph("NUMERIC(14, 4)", td_style),
            Paragraph("Live / cached market price per unit from market data service.", td_style)
        ],
        [
            Paragraph("<b>investments</b>.dividends_received", td_bold_style),
            Paragraph("NUMERIC(14, 2)", td_style),
            Paragraph("Total cumulative dividends distributed by this holding.", td_style)
        ],
        [
            Paragraph("<b>investment_transactions</b>.id", td_bold_style),
            Paragraph("INTEGER", td_style),
            Paragraph("Primary Key, Auto-increment", td_style)
        ],
        [
            Paragraph("<b>investment_transactions</b>.investment_id", td_bold_style),
            Paragraph("INTEGER", td_style),
            Paragraph("Foreign Key &rarr; investments.id (ON DELETE CASCADE), Indexed", td_style)
        ],
        [
            Paragraph("<b>investment_transactions</b>.transaction_type", td_bold_style),
            Paragraph("VARCHAR", td_style),
            Paragraph("Action type: <b>BUY</b>, <b>SELL</b>, or <b>DIVIDEND</b>", td_style)
        ],
        [
            Paragraph("<b>investment_transactions</b>.units / price_per_unit", td_bold_style),
            Paragraph("NUMERIC(14, 4)", td_style),
            Paragraph("Execution lot units and unit price at transaction execution time.", td_style)
        ],
        [
            Paragraph("<b>investment_transactions</b>.total_amount", td_bold_style),
            Paragraph("NUMERIC(14, 2)", td_style),
            Paragraph("Total capital outlay or proceeds (units * price_per_unit).", td_style)
        ]
    ]

    t_schema = Table(db_schema, colWidths=[140, 95, 305])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_schema)
    story.append(Spacer(1, 8))

    # story.append(PageBreak())

    # ==========================================
    # SECTION 4: FRONTEND WEALTH MANAGEMENT UI ARCHITECTURE
    # ==========================================
    story.append(Paragraph("4. Frontend Wealth Management UI & User Experience", h1_style))
    story.append(Paragraph(
        "The frontend (<code>frontend/src/pages/InvestmentsPage.jsx</code>) organizes complex wealth analytics "
        "into a structured, high-density 8-section layout optimized for both desktop and mobile viewports:",
        body_style
    ))

    ui_sections = [
        ("1. Wealth Engine Banner & Grand Total",
         "Header displaying Grand Total Wealth (Equities + Mutual Funds + India Post Sovereign Schemes), "
         "today's P&L badge, live market feed sync status, and primary action buttons (Add Asset / Lot, India Post Schemes)."),

        ("2. Portfolio Overview Metrics Grid",
         "Six KPI cards: Total Invested Cost, Current Market Value, Net Unrealized P&L (amount & %), "
         "Today's Gain/Loss, Total Dividends Collected, and Weighted Portfolio Risk Score (1-10)."),

        ("3. Historical Portfolio Performance Timeline",
         "Area chart tracking capital invested vs. current portfolio value over time, plotting return % progression."),

        ("4. Asset Allocation & Sector Bento Grid",
         "Dual allocation views: 1) Class Breakdown (Stocks, Mutual Funds, Post Office, Gold, Crypto) and "
         "2) Sector Exposure (Financial Services, Technology, Energy & Utilities, Precious Metals, Fixed Income)."),

        ("5. Holdings Ledger & Mobile Card View",
         "Rich table on desktop and responsive cards on mobile showing: Asset Name, Symbol, Exchange, Quantity, "
         "Avg Buy Price, Current Price, Unrealized P&L, and quick action buttons (Buy Lot, Sell Lot, Details Modal, Delete)."),

        ("6. Investment Activity Log",
         "Chronological feed of all historical Buy, Sell, and Dividend events across all holdings with instant filter tabs."),

        ("7. Portfolio Insights Engine",
         "Algorithmic observations: Concentration Warning (flags single holdings exceeding 35% of total portfolio value), "
         "Diversification Index (evaluates asset class distribution), and Net Unrealized Performance analysis."),

        ("8. Sovereign Schemes & Compound Wealth Forecaster",
         "Dual module featuring India Post instruments (PPF, Sukanya Samriddhi) alongside an interactive Compound Wealth "
         "Forecaster with real-time sliders for monthly SIP contribution (₹0-₹1L), CAGR (1-30%), and time horizon (1-30 yrs)."),

        ("9. True Viewport Mobile Modal Architecture",
         "All modals (Add Holding, Buy Lot, Sell Lot, Holding Details Ledger, India Post Scheme) utilize the shared "
         "<code>Modal.jsx</code> built with React <code>createPortal</code>. Modals anchor directly to the viewport "
         "with <code>position: fixed</code>, eliminating container clipping and background scroll locking issues on mobile screens.")
    ]

    for title, desc in ui_sections:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 8))

    # ==========================================
    # SECTION 5: COMPLETE API CONTRACT
    # ==========================================
    story.append(Paragraph("5. Complete REST API Contract (/api/v1/investments)", h1_style))
    story.append(Paragraph(
        "The backend exposes complete RESTful endpoints for holding management, multi-lot transactions, and activities:",
        body_style
    ))

    api_table = [
        [Paragraph("HTTP Method & Path", th_style), Paragraph("Request Payload / Parameters", th_style), Paragraph("Response & Functional Behavior", th_style)],
        [
            Paragraph("<b>GET</b> /api/v1/investments", td_bold_style),
            Paragraph("Bearer Token", td_style),
            Paragraph("Returns consolidated portfolio summary, asset allocation list, India Post grand total, and array of holdings with live P&L and risk metrics.", td_style)
        ],
        [
            Paragraph("<b>GET</b> /api/v1/investments/check-existing", td_bold_style),
            Paragraph("Query: asset_type, symbol, asset_name, exchange", td_style),
            Paragraph("Checks if user already holds the asset. Returns {exists: bool, holding: obj} to enable live modal lot-matching.", td_style)
        ],
        [
            Paragraph("<b>POST</b> /api/v1/investments", td_bold_style),
            Paragraph("JSON: asset_name, asset_type, symbol, exchange, quantity, purchase_price, current_price, purchase_date", td_style),
            Paragraph("Creates new holding OR adds a BUY lot to existing holding using duplicate prevention. Recalculates WAC automatically.", td_style)
        ],
        [
            Paragraph("<b>POST</b> /api/v1/investments/{id}/buy", td_bold_style),
            Paragraph("JSON: units, price_per_unit, transaction_date, notes", td_style),
            Paragraph("Executes a BUY lot on holding. Updates aggregate quantity and weighted average purchase price. Logs transaction record.", td_style)
        ],
        [
            Paragraph("<b>POST</b> /api/v1/investments/{id}/sell", td_bold_style),
            Paragraph("JSON: units, price_per_unit, transaction_date, notes", td_style),
            Paragraph("Executes a SELL lot. Validates available units, computes realized gain/loss against WAC, reduces remaining quantity.", td_style)
        ],
        [
            Paragraph("<b>POST</b> /api/v1/investments/{id}/dividend", td_bold_style),
            Paragraph("JSON: total_amount, transaction_date, notes", td_style),
            Paragraph("Logs cash dividend distribution. Increments cumulative dividends received on holding.", td_style)
        ],
        [
            Paragraph("<b>GET</b> /api/v1/investments/{id}/transactions", td_bold_style),
            Paragraph("URL: inv_id", td_style),
            Paragraph("Returns chronological ledger of all Buy, Sell, and Dividend transactions for specific holding.", td_style)
        ],
        [
            Paragraph("<b>GET</b> /api/v1/investments/activity", td_bold_style),
            Paragraph("Bearer Token", td_style),
            Paragraph("Returns global activity feed of all investment transactions across the user's entire portfolio.", td_style)
        ],
        [
            Paragraph("<b>DELETE</b> /api/v1/investments/{id}", td_bold_style),
            Paragraph("URL: inv_id", td_style),
            Paragraph("Deletes holding and cascades deletion to all associated lot transaction records.", td_style)
        ]
    ]

    t_api = Table(api_table, colWidths=[150, 140, 250])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 8))

    # ==========================================
    # SECTION 6: VERIFICATION & TESTING
    # ==========================================
    story.append(Paragraph("6. Automated Verification & Quality Assurance", h1_style))
    story.append(Paragraph(
        "The investment module is safeguarded by dedicated unit and integration tests executing within the 60-test pytest suite:",
        body_style
    ))

    story.append(Paragraph("&bull; <code>test_investment_lots.py::test_multi_lot_buy_recalculates_weighted_average</code>: Verifies that adding multiple buy lots (e.g. 10 shares @ ₹100, then 10 shares @ ₹200) produces an exact quantity of 20 and WAC of ₹150.00.", bullet_style))
    story.append(Paragraph("&bull; <code>test_investment_lots.py::test_sell_lot_reduces_quantity_and_computes_realized_pl</code>: Verifies that selling shares accurately calculates realized gain against the WAC basis and enforces unit availability constraints.", bullet_style))
    story.append(Paragraph("&bull; <code>test_investment_lots.py::test_duplicate_holding_prevention_api</code>: Ensures that posting the same asset symbol twice does not create duplicate rows in the <code>investments</code> table.", bullet_style))
    story.append(Paragraph("&bull; <code>test_investment_lots.py::test_holding_transactions_endpoint</code>: Validates that the transaction history endpoint returns all chronological lots with correct types and timestamps.", bullet_style))
    story.append(Paragraph("&bull; <code>test_india_post.py</code> & <code>test_india_post_investments.py</code>: Verifies sovereign interest calculations, maturity dates, and Section 80C tax deduction tracking.", bullet_style))

    story.append(Spacer(1, 8))
    story.append(create_callout(
        "Conclusion: The PariView Investments section provides an institutional-grade wealth management platform. "
        "With multi-lot WAC accounting, duplicate holding prevention, live market pricing, sovereign India Post scheme "
        "reconciliation, compound wealth forecasting, and true viewport mobile bottom sheets, the system delivers "
        "uncompromising financial precision and a world-class user experience.",
        title="OPERATIONAL READINESS STATUS: PRODUCTION CERTIFIED",
        border_color="#10B981",
        bg_color="#ECFDF5",
        text_color="#064E3B"
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Successfully generated Investment PDF report at: {pdf_path}")


if __name__ == "__main__":
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "docs")
    os.makedirs(docs_dir, exist_ok=True)
    target_pdf = os.path.abspath(os.path.join(docs_dir, "PARIVIEW_INVESTMENT_ENGINE_REPORT.pdf"))
    generate_investment_pdf(target_pdf)

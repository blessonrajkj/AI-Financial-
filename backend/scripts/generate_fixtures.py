import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw

def create_fixtures():
    fixtures_dir = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures")
    os.makedirs(fixtures_dir, exist_ok=True)

    # 1. Generate sanitized SBI PDF statement
    pdf_path = os.path.join(fixtures_dir, "sample_sbi_statement.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 750, "STATE BANK OF INDIA")
    c.setFont("Helvetica", 10)
    c.drawString(50, 735, "STATEMENT OF ACCOUNT FOR PERIOD 01/09/2026 TO 25/09/2026")
    c.drawString(50, 720, "ACCOUNT NO: XXXXXXXX1234 | BRANCH: BANGALORE MAIN")
    c.drawString(50, 705, "IFS CODE: SBIN0000813 | CIF NO: 85920192039")

    # Headers
    c.drawString(50, 670, "Date         Details                                         Debit        Credit       Balance")
    c.line(50, 665, 550, 665)

    # Rows
    c.drawString(50, 645, "05/09/2026  UPI/123456789012/SWIGGY/swiggy@paytm/FOOD       540.00                    49460.00")
    c.drawString(50, 625, "10/09/2026  NEFT CR-SALARY FOR SEPTEMBER-TECH CORP          -            50000.00     99460.00")
    c.drawString(50, 605, "15/09/2026  ATM WDL 4567 MG ROAD BANGALORE                  2000.00                   97460.00")
    c.save()
    print(f"Generated {pdf_path}")

    # 2. Generate sanitized UPI Screenshot image
    png_path = os.path.join(fixtures_dir, "sample_upi_screenshot.png")
    img = Image.new('RGB', (400, 600), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([(0, 0), (400, 80)], fill=(26, 115, 232))
    d.text((20, 30), "Google Pay", fill=(255, 255, 255))
    d.text((50, 150), "Paid to Swiggy", fill=(0, 0, 0))
    d.text((50, 190), "₹ 540", fill=(0, 0, 0))
    d.text((50, 240), "Completed • Sep 05, 2026", fill=(100, 100, 100))
    d.text((50, 280), "UPI Ref No: 123456789012", fill=(100, 100, 100))
    img.save(png_path)
    print(f"Generated {png_path}")

    # 3. Generate sanitized CSV transaction import fixture
    csv_path = os.path.join(fixtures_dir, "sample_transactions.csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("Date,Description,Category,Subcategory,Type,Amount\n")
        f.write("2026-09-01,Monthly Salary,Salary,Base,INCOME,50000.00\n")
        f.write("2026-09-05,Swiggy Food Delivery,Food & Dining,Food Delivery,EXPENSE,540.00\n")
        f.write("2026-09-10,Supermarket Groceries,Food & Dining,Groceries,EXPENSE,3200.00\n")
    print(f"Generated {csv_path}")

if __name__ == "__main__":
    create_fixtures()

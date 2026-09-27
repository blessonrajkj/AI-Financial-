"""
Central Category Taxonomy Service for PariView.
Single source of truth for Expense Main Categories, Subcategories, Income Categories, and Transfer Categories.
"""

# Expense Main Categories and their Subcategories
EXPENSE_TAXONOMY = {
    "Food & Dining": [
        "Groceries",
        "Restaurants",
        "Food Delivery",
        "Cafes & Coffee",
        "Snacks",
        "Fast Food"
    ],
    "Transportation": [
        "Fuel",
        "Public Transport",
        "Taxi / Cab",
        "Auto / Rickshaw",
        "Ride Sharing",
        "Parking",
        "Vehicle Maintenance",
        "Vehicle Insurance"
    ],
    "Shopping": [
        "Clothing",
        "Electronics",
        "Home & Kitchen",
        "Personal Shopping",
        "Online Shopping",
        "Gifts",
        "Other Shopping"
    ],
    "Bills & Utilities": [
        "Electricity",
        "Water",
        "Gas",
        "Internet",
        "Mobile / Phone",
        "DTH / Cable",
        "Maintenance",
        "Other Bills"
    ],
    "Housing": [
        "Rent",
        "Home Loan / EMI",
        "Property Maintenance",
        "Household Expenses",
        "Furniture",
        "Repairs"
    ],
    "Health & Medical": [
        "Doctor",
        "Medicines",
        "Hospital",
        "Dental",
        "Lab / Tests",
        "Health Insurance",
        "Pharmacy"
    ],
    "Education": [
        "College / Tuition",
        "Books",
        "Courses",
        "Certifications",
        "Exams / Fees",
        "Stationery",
        "Education Materials"
    ],
    "Entertainment": [
        "Movies",
        "Gaming",
        "Events",
        "Music",
        "Hobbies",
        "Streaming"
    ],
    "Subscriptions": [
        "Netflix",
        "Spotify",
        "YouTube",
        "Amazon Prime",
        "Cloud Storage",
        "Software",
        "AI Tools",
        "Other Subscriptions"
    ],
    "Personal Care": [
        "Haircut / Salon",
        "Grooming",
        "Cosmetics",
        "Clothing & Accessories",
        "Fitness",
        "Personal Care"
    ],
    "Travel": [
        "Flights",
        "Train",
        "Bus",
        "Hotels",
        "Food During Travel",
        "Travel Activities",
        "Travel Insurance"
    ],
    "Family & Household": [
        "Family Support",
        "Parents",
        "Children",
        "Household Supplies",
        "Domestic Help",
        "Family Events"
    ],
    "Financial": [
        "Bank Charges",
        "Credit Card Payment",
        "Loan Payment",
        "EMI",
        "Interest",
        "Insurance",
        "Taxes",
        "Investment",
        "Savings"
    ],
    "Investments": [
        "Stocks",
        "Mutual Funds",
        "SIP",
        "Fixed Deposit",
        "PPF",
        "NSC",
        "KVP",
        "Post Office",
        "Bonds",
        "Gold",
        "Other Investments"
    ],
    "Cash & Transfers": [
        "Cash Withdrawal",
        "Cash Deposit",
        "Bank Transfer",
        "UPI Transfer",
        "NEFT",
        "IMPS",
        "Internal Transfer"
    ],
    "Donations & Charity": [
        "Charity",
        "Religious Donations",
        "Community",
        "Crowdfunding"
    ],
    "Government & Taxes": [
        "Income Tax",
        "GST",
        "Government Fees",
        "Fines / Penalties",
        "Other Government Payments"
    ],
    "Business / Work": [
        "Business Expenses",
        "Office Supplies",
        "Software",
        "Professional Services",
        "Travel for Work",
        "Freelance Expenses"
    ],
    "Miscellaneous": [
        "Other",
        "Uncategorized"
    ]
}

# Income Categories
INCOME_TAXONOMY = {
    "Income": [
        "Salary",
        "Freelance",
        "Business Income",
        "Internship",
        "Allowance",
        "Pocket Money",
        "Interest",
        "Dividend",
        "Investment Returns",
        "Rental Income",
        "Cashback",
        "Refund",
        "Gift Received",
        "Cash Deposit",
        "Bank Transfer Received",
        "Other Income"
    ]
}

# Transfer Categories
TRANSFER_TAXONOMY = {
    "Cash & Transfers": [
        "Internal Transfer",
        "Bank Transfer",
        "UPI Transfer",
        "NEFT",
        "IMPS",
        "Cash Withdrawal",
        "Cash Deposit"
    ]
}

INCOME_CATEGORIES = INCOME_TAXONOMY["Income"]
TRANSFER_CATEGORIES = TRANSFER_TAXONOMY["Cash & Transfers"]

# Legacy category mapping to new (Main Category, Subcategory)
LEGACY_MAPPING = {
    "food": ("Food & Dining", "Groceries"),
    "groceries": ("Food & Dining", "Groceries"),
    "transportation": ("Transportation", "Public Transport"),
    "fuel": ("Transportation", "Fuel"),
    "healthcare": ("Health & Medical", "Pharmacy"),
    "medical": ("Health & Medical", "Doctor"),
    "entertainment": ("Entertainment", "Movies"),
    "education": ("Education", "Courses"),
    "shopping": ("Shopping", "Online Shopping"),
    "utilities": ("Bills & Utilities", "Electricity"),
    "bills": ("Bills & Utilities", "Other Bills"),
    "housing": ("Housing", "Rent"),
    "travel": ("Travel", "Hotels"),
    "insurance": ("Financial", "Insurance"),
    "investments": ("Investments", "Mutual Funds"),
    "investment": ("Investments", "Mutual Funds"),
    "subscriptions": ("Subscriptions", "Software"),
    "recharge": ("Bills & Utilities", "Mobile / Phone"),
    "miscellaneous": ("Miscellaneous", "Other"),
    "others": ("Miscellaneous", "Other"),
    "salary": ("Income", "Salary"),
    "refunds": ("Income", "Refund"),
    "other income": ("Income", "Other Income")
}

def map_legacy_category(category_name: str) -> tuple[str, str]:
    if not category_name:
        return "Miscellaneous", "Other"
    key = category_name.lower().strip()
    if key in LEGACY_MAPPING:
        return LEGACY_MAPPING[key]
    for main, subcats in EXPENSE_TAXONOMY.items():
        if main.lower() == key:
            return main, subcats[0]
        for sub in subcats:
            if sub.lower() == key:
                return main, sub
    return "Miscellaneous", "Other"

def get_full_taxonomy():
    """Returns complete taxonomy structure for API and UI consumption."""
    return {
        "expense": EXPENSE_TAXONOMY,
        "income": INCOME_TAXONOMY,
        "transfer": TRANSFER_TAXONOMY
    }

def validate_category_combination(tx_type: str, main_cat: str, subcat: str | None = None) -> tuple[str, str]:
    """
    Validates and normalizes (Main Category, Subcategory) for a given transaction type.
    Returns (valid_main_category, valid_subcategory).
    """
    type_clean = (tx_type or "expense").lower()

    if type_clean == "income":
        valid_subcats = INCOME_TAXONOMY["Income"]
        if subcat and any(s.lower() == subcat.lower() for s in valid_subcats):
            matched = next(s for s in valid_subcats if s.lower() == subcat.lower())
            return "Income", matched
        elif main_cat and any(s.lower() == main_cat.lower() for s in valid_subcats):
            matched = next(s for s in valid_subcats if s.lower() == main_cat.lower())
            return "Income", matched
        return "Income", "Other Income"

    if type_clean == "transfer":
        valid_subcats = TRANSFER_TAXONOMY["Cash & Transfers"]
        if subcat and any(s.lower() == subcat.lower() for s in valid_subcats):
            matched = next(s for s in valid_subcats if s.lower() == subcat.lower())
            return "Cash & Transfers", matched
        return "Cash & Transfers", "Internal Transfer"

    # Default: Expense
    matched_main = None
    for main in EXPENSE_TAXONOMY.keys():
        if main.lower() == main_cat.lower():
            matched_main = main
            break

    if not matched_main:
        # Check legacy mapping
        legacy = LEGACY_MAPPING.get(main_cat.lower())
        if legacy:
            matched_main, legacy_sub = legacy
            if not subcat:
                subcat = legacy_sub
        else:
            matched_main = "Miscellaneous"

    allowed_subcats = EXPENSE_TAXONOMY.get(matched_main, ["Other"])
    matched_sub = None
    if subcat:
        for sub in allowed_subcats:
            if sub.lower() == subcat.lower():
                matched_sub = sub
                break

    if not matched_sub:
        matched_sub = allowed_subcats[0] if allowed_subcats else "Uncategorized"

    return matched_main, matched_sub

def auto_categorize(tx_type: str = "expense", merchant: str = "", description: str = "") -> tuple[str, str, str]:
    """
    Auto-categorize transaction based on merchant name and description.
    Returns (tx_type, main_category, subcategory).
    """
    text = f"{merchant} {description}".lower()

    # Detect transfers first
    if any(k in text for k in ["transfer", "internal transfer", "self transfer", "own account"]):
        return "transfer", "Cash & Transfers", "Internal Transfer"
    elif any(k in text for k in ["neft", "rtgs", "imps"]) and not any(k in text for k in ["salary", "refund"]):
        return "transfer", "Cash & Transfers", "Bank Transfer"
    elif "cash withdrawal" in text or "atm wdl" in text or "atm withdrawal" in text:
        return "transfer", "Cash & Transfers", "Cash Withdrawal"
    elif "cash deposit" in text:
        return "transfer", "Cash & Transfers", "Cash Deposit"

    # Income Detection
    if any(k in text for k in ["salary", "payroll", "stipend"]):
        return "income", "Income", "Salary"
    elif any(k in text for k in ["freelance", "upwork", "fiverr"]):
        return "income", "Income", "Freelance"
    elif any(k in text for k in ["cashback", "reward point"]):
        return "income", "Income", "Cashback"
    elif "refund" in text or "reimbursement" in text:
        return "income", "Income", "Refund"
    elif any(k in text for k in ["interest credit", "int.paid"]):
        return "income", "Income", "Interest"
    elif "dividend" in text:
        return "income", "Income", "Dividend"

    # Expense Rule Mapping
    rules = [
        # Food & Dining
        ("Food & Dining", "Food Delivery", ["swiggy", "zomato", "ubereats", "eats"]),
        ("Food & Dining", "Fast Food", ["dominos", "kfc", "mcdonald", "burger king", "subway", "pizza hut"]),
        ("Food & Dining", "Groceries", ["blinkit", "zepto", "bigbasket", "instamart", "grocery", "supermarket", "dmart"]),
        ("Food & Dining", "Cafes & Coffee", ["starbucks", "third wave", "blue tokai", "cafe", "coffee", "chai"]),
        ("Food & Dining", "Restaurants", ["restaurant", "dining", "bistro", "dhaba", "bar & kitchen"]),

        # Subscriptions
        ("Subscriptions", "Netflix", ["netflix"]),
        ("Subscriptions", "Spotify", ["spotify"]),
        ("Subscriptions", "YouTube", ["youtube", "yt premium"]),
        ("Subscriptions", "Amazon Prime", ["amazon prime", "prime video"]),
        ("Subscriptions", "AI Tools", ["chatgpt", "openai", "claude", "midjourney"]),
        ("Subscriptions", "Cloud Storage", ["google storage", "icloud", "dropbox", "drive"]),

        # Transportation
        ("Transportation", "Ride Sharing", ["uber", "ola", "rapido"]),
        ("Transportation", "Fuel", ["shell", "petrol", "diesel", "fuel", "indian oil", "hpcl", "bpcl"]),
        ("Transportation", "Public Transport", ["irctc", "railway", "metro", "bus"]),

        # Shopping
        ("Shopping", "Online Shopping", ["amazon", "flipkart", "myntra", "zara", "meesho", "ajio"]),
        ("Shopping", "Electronics", ["croma", "reliance digital", "apple", "samsung"]),

        # Bills & Utilities
        ("Bills & Utilities", "Mobile / Phone", ["jio", "airtel", "vi", "recharge", "mobile bill"]),
        ("Bills & Utilities", "Electricity", ["electricity", "eb bill", "bescom", "tneb", "power"]),

        # Health & Medical
        ("Health & Medical", "Pharmacy", ["apollo", "pharmacy", "1mg", "netmeds", "pharmeasy"]),
        ("Health & Medical", "Doctor", ["hospital", "clinic", "doctor", "lab", "pathology"])
    ]

    for main_cat, sub_cat, keywords in rules:
        if any(kw in text for kw in keywords):
            return "expense", main_cat, sub_cat

    # Fallback legacy mapping if provided type is specified
    return tx_type or "expense", "Miscellaneous", "Other"

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sqlalchemy.orm import Session
from app.models.category_merchant import Category
from app.models.transaction import Transaction

class MLCategorizer:
    def __init__(self):
        self.pipeline = None
        self.categories_map = {}
        # Predefined rule map to ensure cold start works flawlessly
        self.keyword_rules = {
            "food": ["restaurant", "cafe", "mcdonald", "starbucks", "burger", "pizza", "dining", "eats", "subway", "kfc", "dominos", "swiggy", "zomato"],
            "groceries": ["walmart", "target", "grocery", "market", "supermarket", "costco", "aldi", "kroger", "tesco", "instacart"],
            "transportation": ["uber", "lyft", "taxi", "metro", "bus", "train", "subway", "cab", "ola"],
            "fuel": ["shell", "chevron", "bp", "exxon", "gas", "fuel", "petrol"],
            "entertainment": ["netflix", "spotify", "disney", "hulu", "cinema", "movie", "theater", "gaming", "steam", "playstation", "xbox"],
            "healthcare": ["pharmacy", "doctor", "clinic", "hospital", "medical", "dentist", "cvs", "walgreens"],
            "shopping": ["amazon", "ebay", "walmart", "clothing", "nike", "adidas", "zara", "h&m", "boutique", "mall"],
            "utilities": ["electricity", "water", "power", "sewer", "gas bill", "trash", "internet", "wifi", "comcast", "verizon", "att"],
            "insurance": ["geico", "progressive", "state farm", "allstate", "insurance", "metlife"],
            "bills": ["rent", "mortgage", "subscription", "invoice", "payment", "due"],
            "investments": ["stocks", "fidelity", "vanguard", "robinhood", "crypto", "bitcoin", "coinbase", "binance", "mutual fund"],
            "subscriptions": ["netflix", "spotify", "aws", "github", "patreon", "youtube premium", "adobe", "canva", "icloud"],
            "education": ["course", "udemy", "coursera", "bookstore", "tuition", "school", "college", "class"]
        }

    def train_model(self, db: Session):
        try:
            # Query all user transactions that have a category
            transactions = db.query(Transaction).filter(Transaction.category_id != None).all()
            
            # Fetch all categories to create name maps
            categories = db.query(Category).all()
            self.categories_map = {cat.id: cat.name.lower() for cat in categories}
            self.categories_id_map = {cat.name.lower(): cat.id for cat in categories}
            
            if len(transactions) < 5:
                # Not enough data to train TF-IDF, keep pipeline as None and use keyword matching
                self.pipeline = None
                return
                
            X = []
            y = []
            for t in transactions:
                # Build representation of transaction (merchant + description)
                desc = f"{t.merchant.name if t.merchant else ''} {t.description or ''}".lower().strip()
                if desc:
                    X.append(desc)
                    # Train on category name (string) to handle user-created categories seamlessly
                    cat_name = self.categories_map.get(t.category_id, "miscellaneous")
                    y.append(cat_name)
                    
            if len(set(y)) < 2:
                # Requires at least two classes to train classifier
                self.pipeline = None
                return

            self.pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
                ('clf', MultinomialNB())
            ])
            self.pipeline.fit(X, y)
            print(f"Classifier successfully trained on {len(X)} samples across {len(set(y))} categories.")
        except Exception as e:
            print(f"Error training categorizer model: {e}")
            self.pipeline = None

    def predict_category(self, merchant_name: str, description: str, db: Session) -> int | None:
        text = f"{merchant_name or ''} {description or ''}".lower().strip()
        if not text:
            return self._get_category_id_by_name("miscellaneous", db)

        # 1. If we have a trained pipeline, attempt ML prediction
        if self.pipeline is not None:
            try:
                predicted_name = self.pipeline.predict([text])[0]
                cat_id = self._get_category_id_by_name(predicted_name, db)
                if cat_id:
                    return cat_id
            except Exception as e:
                print(f"ML prediction failed: {e}")

        # 2. Rule-based keyword matching fallback
        for category_name, keywords in self.keyword_rules.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', text):
                    cat_id = self._get_category_id_by_name(category_name, db)
                    if cat_id:
                        return cat_id

        # 3. Default to Miscellaneous
        return self._get_category_id_by_name("miscellaneous", db)

    def _get_category_id_by_name(self, name: str, db: Session) -> int | None:
        # Check cache/db
        category = db.query(Category).filter(Category.name.ilike(name)).first()
        if category:
            return category.id
        return None

ml_categorizer = MLCategorizer()

import pytest
from app.services.category_taxonomy import (
    EXPENSE_TAXONOMY,
    INCOME_CATEGORIES,
    TRANSFER_CATEGORIES,
    validate_category_combination,
    auto_categorize,
    map_legacy_category
)

def test_expense_taxonomy_structure():
    assert "Food & Dining" in EXPENSE_TAXONOMY
    assert "Groceries" in EXPENSE_TAXONOMY["Food & Dining"]
    assert "Shopping" in EXPENSE_TAXONOMY
    assert "Online Shopping" in EXPENSE_TAXONOMY["Shopping"]
    assert len(EXPENSE_TAXONOMY.keys()) == 19

def test_income_and_transfer_categories():
    assert "Salary" in INCOME_CATEGORIES
    assert "Internal Transfer" in TRANSFER_CATEGORIES
    assert "Bank Transfer" in TRANSFER_CATEGORIES

def test_validate_category_combination():
    # Valid expense combination
    main_cat, sub_cat = validate_category_combination("expense", "Food & Dining", "Groceries")
    assert main_cat == "Food & Dining"
    assert sub_cat == "Groceries"

    # Invalid subcategory fallback
    main_cat, sub_cat = validate_category_combination("expense", "Food & Dining", "NonExistentSub")
    assert main_cat == "Food & Dining"
    assert sub_cat == "Groceries"  # Default first subcategory

    # Transfer validation
    main_cat, sub_cat = validate_category_combination("transfer", "Cash & Transfers", "Internal Transfer")
    assert main_cat == "Cash & Transfers"
    assert sub_cat == "Internal Transfer"

def test_auto_categorize():
    # Test food delivery rule
    tx_type, main_cat, sub_cat = auto_categorize("expense", "Swiggy", "Swiggy order #123")
    assert tx_type == "expense"
    assert main_cat == "Food & Dining"
    assert sub_cat == "Food Delivery"

    # Test salary income rule
    tx_type, main_cat, sub_cat = auto_categorize("income", "Company Pvt Ltd", "Monthly Salary Credit")
    assert tx_type == "income"
    assert main_cat == "Income"
    assert sub_cat == "Salary"

    # Test internal transfer rule
    tx_type, main_cat, sub_cat = auto_categorize("expense", "SBI Account", "Internal Transfer to savings")
    assert tx_type == "transfer"
    assert main_cat == "Cash & Transfers"
    assert sub_cat == "Internal Transfer"

def test_map_legacy_category():
    main_cat, sub_cat = map_legacy_category("Food")
    assert main_cat == "Food & Dining"
    assert sub_cat == "Groceries"

    main_cat, sub_cat = map_legacy_category("Fuel")
    assert main_cat == "Transportation"
    assert sub_cat == "Fuel"

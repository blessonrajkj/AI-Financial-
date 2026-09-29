import os
import re
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT_DIR / "docs"
FACTS_FILE = DOCS_DIR / "generated" / "PROJECT_FACTS.json"

STALE_PATTERNS = [
    (r"38/38", "Stale test count 38/38 found (should match Pytest passed count)"),
    (r"\bdouble-entry\b", "Stale terminology 'double-entry' found (should be 'Internal Transfers')"),
    (r"\bdouble entry\b", "Stale terminology 'double entry' found (should be 'Internal Transfers')"),
    (r"stateful JWT", "Unsupported buzzword 'stateful JWT' found"),
    (r"Zero Trust", "Unsupported buzzword 'Zero Trust' found"),
    (r"Float", "Legacy 'Float' type claim found for monetary fields (monetary fields use Numeric/Decimal)"),
]

def verify_consistency():
    if not FACTS_FILE.exists():
        print(f"[ERROR] Facts file not found at {FACTS_FILE}. Run scripts/generate_project_facts.py first.")
        sys.exit(1)

    with open(FACTS_FILE, "r", encoding="utf-8") as f:
        facts = json.load(f)

    passed_count = facts["testing"]["pytest"]["passed"]
    commit_hash = facts["git"]["commit_hash"]
    router_count = facts["api"]["router_count"]
    endpoint_count = facts["api"]["endpoint_count"]

    print(f"--- VERIFYING DOCUMENTATION CONSISTENCY AGAINST PROJECT FACTS ---")
    print(f"Current Git Commit: {commit_hash}")
    print(f"Pytest Passed Count: {passed_count}")
    print(f"Router Count: {router_count}")
    print(f"Endpoint Count: {endpoint_count}\n")

    issues = []

    md_files = list(DOCS_DIR.glob("*.md")) + list((DOCS_DIR / "generated").glob("*.md"))

    for md_path in md_files:
        filename = md_path.name
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check for stale patterns
        for pattern, desc in STALE_PATTERNS:
            # Skip checking 'double-entry' in REMEDIATION_AUDIT if it's explicitly explaining why double-entry was renamed to internal transfers
            if "double-entry" in pattern and "REMEDIATION_AUDIT" in filename:
                continue
            if "Float" in pattern:
                matches = re.findall(r"(?:amount|balance|price|quantity|target_amount|total_amount)\s*:\s*Float", content, re.IGNORECASE)
                if matches:
                    issues.append(f"[{filename}] {desc}: {matches[:2]}")
                continue

            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                issues.append(f"[{filename}] {desc} ({len(matches)} occurrences)")

        # Check for stale router / endpoint numbers in docs if explicitly stated
        # e.g. "12 API routers" or "38 tests"
        stale_router = re.findall(r"\b(\d+)\s+API routers\b", content, re.IGNORECASE)
        for num in stale_router:
            if int(num) != router_count:
                issues.append(f"[{filename}] Mismatched router count '{num}' vs actual '{router_count}'")

        stale_endpoint = re.findall(r"\b(\d+)\s+endpoints\b", content, re.IGNORECASE)
        for num in stale_endpoint:
            if int(num) != endpoint_count:
                issues.append(f"[{filename}] Mismatched endpoint count '{num}' vs actual '{endpoint_count}'")

    if issues:
        print("[FAIL] Documentation consistency issues found:")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print("[SUCCESS] All documentation files are consistent with verified project facts!")

if __name__ == "__main__":
    verify_consistency()

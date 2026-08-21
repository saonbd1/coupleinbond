from pathlib import Path
import json
import re

ROOT = Path(__file__).parent
TEMPLATES = {
    "blog-post-template.html": ["BlogPosting", "BreadcrumbList", "og:type", "canonical", "BLOG_BODY_HTML"],
    "poll-page-template.html": ["Question", "BreadcrumbList", "og:image", "canonical", "POLL_OPTIONS_HTML"],
    "quote-page-template.html": ["CreativeWork", "BreadcrumbList", "og:image", "canonical", "QUOTE_TEXT"],
}

for filename, required in TEMPLATES.items():
    path = ROOT / filename
    text = path.read_text(encoding="utf-8")
    assert text.startswith("<!doctype html>"), f"{filename}: missing doctype"
    assert '<meta name="viewport"' in text, f"{filename}: missing responsive viewport"
    assert '<script type="application/ld+json"' in text, f"{filename}: missing JSON-LD"
    for token in required:
        assert token in text, f"{filename}: missing required marker {token}"

    placeholders = set(re.findall(r"\{\{([A-Z0-9_]+)\}\}", text))
    assert placeholders, f"{filename}: no placeholders found"
    for token in placeholders:
        assert text.count("{{" + token + "}}") >= 1

    for match in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', text, re.S):
        schema_text = match.group(1)
        schema_text = re.sub(r"\{\{[A-Z0-9_]+\}\}", "PLACEHOLDER", schema_text)
        schema_text = re.sub(r'(:\s*)PLACEHOLDER([,}])', r'\1"PLACEHOLDER"\2', schema_text)
        schema_text = schema_text.replace('[PLACEHOLDER]', '["PLACEHOLDER"]')
        schema_text = schema_text.replace('[PLACEHOLDER,PLACEHOLDER]', '["PLACEHOLDER","PLACEHOLDER"]')
        schema_text = schema_text.replace('"answerCount": "PLACEHOLDER"', '"answerCount": 1')
        try:
            json.loads(schema_text)
        except json.JSONDecodeError as exc:
            raise AssertionError(f"{filename}: invalid JSON-LD after placeholder substitution: {exc}")

print("Validated:")
for filename in TEMPLATES:
    print(f"- {filename}")

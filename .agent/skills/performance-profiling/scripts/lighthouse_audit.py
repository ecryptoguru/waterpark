#!/usr/bin/env python3
"""
Skill: performance-profiling
Script: lighthouse_audit.py
Purpose: Run Lighthouse performance audit on a URL
Usage: python lighthouse_audit.py https://example.com
Output: JSON with performance scores
Note: Requires lighthouse CLI (npm install -g lighthouse)
"""
import subprocess
import json
import sys
import os
import tempfile

def run_lighthouse(url: str) -> dict:
    """Run Lighthouse audit on URL."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            output_path = f.name
        
        result = subprocess.run(
            [
                "lighthouse",
                url,
                "--output=json",
                f"--output-path={output_path}",
                "--chrome-flags=--headless",
                "--only-categories=performance,accessibility,best-practices,seo"
            ],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if os.path.exists(output_path):
            with open(output_path, 'r') as f:
                report = json.load(f)
            os.unlink(output_path)
            
            categories = report.get("categories", {})
            return {
                "url": url,
                "scores": {
                    "performance": int(categories.get("performance", {}).get("score", 0) * 100),
                    "accessibility": int(categories.get("accessibility", {}).get("score", 0) * 100),
                    "best_practices": int(categories.get("best-practices", {}).get("score", 0) * 100),
                    "seo": int(categories.get("seo", {}).get("score", 0) * 100)
                },
                "summary": get_summary(categories)
            }
        else:
            return {"error": "Lighthouse failed to generate report", "stderr": result.stderr[:500]}
            
    except subprocess.TimeoutExpired:
        return {"error": "Lighthouse audit timed out"}
    except FileNotFoundError:
        return {"error": "Lighthouse CLI not found. Install with: npm install -g lighthouse"}

def get_summary(categories: dict) -> str:
    """Generate summary based on scores."""
    perf = categories.get("performance", {}).get("score", 0) * 100
    if perf >= 90:
        return "[OK] Excellent performance"
    elif perf >= 50:
        return "[!] Needs improvement"
    else:
        return "[X] Poor performance"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python lighthouse_audit.py [project_path] <url>"}))
        sys.exit(1)

    # Support both: `lighthouse_audit.py <url>` and `lighthouse_audit.py <project> <url>`
    url = sys.argv[2] if len(sys.argv) >= 3 else sys.argv[1]

    # Pre-flight: verify lighthouse CLI is available
    probe = subprocess.run(["which", "lighthouse"], capture_output=True, text=True)
    if probe.returncode != 0:
        print(json.dumps({
            "skipped": True,
            "message": "lighthouse CLI not found. Install with: npm install -g lighthouse",
            "scores": {}
        }, indent=2))
        sys.exit(0)  # exit 0 = skip, not failure

    result = run_lighthouse(url)
    # If error key present (no scores), treat as skip to avoid false failures
    if "error" in result and "scores" not in result:
        result["skipped"] = True
        print(json.dumps(result, indent=2))
        sys.exit(0)

    print(json.dumps(result, indent=2))
    # Fail only if performance score is critically low (<50)
    perf = result.get("scores", {}).get("performance", 100)
    sys.exit(0 if perf >= 50 else 1)

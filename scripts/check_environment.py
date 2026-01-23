#!/usr/bin/env python3
"""
Environment Check Script for Thesis Formatter (Python version)
Run this script on the remote Linux server to verify all dependencies

Usage: python3 check_environment.py
"""

import sys
import os
import subprocess
import shutil
from pathlib import Path

# Colors
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    END = '\033[0m'

pass_count = 0
fail_count = 0
warn_count = 0

def passed(msg):
    global pass_count
    print(f"{Colors.GREEN}[PASS]{Colors.END} {msg}")
    pass_count += 1

def failed(msg):
    global fail_count
    print(f"{Colors.RED}[FAIL]{Colors.END} {msg}")
    fail_count += 1

def warning(msg):
    global warn_count
    print(f"{Colors.YELLOW}[WARN]{Colors.END} {msg}")
    warn_count += 1

def info(msg):
    print(f"      {msg}")

def section(title):
    print(f"\n--- {title} ---")

def main():
    print("=" * 50)
    print("Thesis Formatter Environment Check (Python)")
    print("=" * 50)

    # ===========================================
    # 1. Python Version
    # ===========================================
    section("Python Version")
    py_version = sys.version_info
    if py_version >= (3, 8):
        passed(f"Python {py_version.major}.{py_version.minor}.{py_version.micro}")
    else:
        failed(f"Python {py_version.major}.{py_version.minor} (3.8+ required)")

    # ===========================================
    # 2. Required Python Packages
    # ===========================================
    section("Python Packages")

    packages = [
        ("PyMuPDF", "fitz", "PDF extraction"),
        ("Pillow", "PIL", "Image processing"),
        ("python-docx", "docx", "DOCX extraction"),
    ]

    for pkg_name, import_name, description in packages:
        try:
            module = __import__(import_name)
            version = getattr(module, '__version__', 'unknown')
            passed(f"{pkg_name} {version} - {description}")
        except ImportError:
            failed(f"{pkg_name} - {description}")
            info(f"  Install: pip3 install {pkg_name}")

    # ===========================================
    # 3. PyMuPDF Detailed Check
    # ===========================================
    section("PyMuPDF Features")
    try:
        import fitz
        passed(f"PyMuPDF version: {fitz.version[0]}")

        # Check if table extraction is available
        doc = fitz.open()
        page = doc.new_page()
        if hasattr(page, 'find_tables'):
            passed("Table extraction (find_tables) available")
        else:
            warning("Table extraction not available (older PyMuPDF version)")
        doc.close()

    except ImportError:
        failed("PyMuPDF not installed")
    except Exception as e:
        warning(f"PyMuPDF check error: {e}")

    # ===========================================
    # 4. External Commands
    # ===========================================
    section("External Commands")

    commands = [
        ("tectonic", "LaTeX compilation"),
        ("node", "Node.js runtime"),
        ("npm", "Node package manager"),
        ("fc-list", "Font configuration"),
    ]

    for cmd, description in commands:
        if shutil.which(cmd):
            try:
                result = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=10)
                version = result.stdout.split('\n')[0] if result.stdout else "available"
                passed(f"{cmd}: {version[:50]}")
            except:
                passed(f"{cmd}: available")
        else:
            if cmd == "fc-list":
                warning(f"{cmd} not found - {description}")
            else:
                failed(f"{cmd} not found - {description}")

    # ===========================================
    # 5. Font Check
    # ===========================================
    section("System Fonts")

    if shutil.which("fc-list"):
        try:
            result = subprocess.run(["fc-list"], capture_output=True, text=True, timeout=30)
            fonts_output = result.stdout.lower()

            required_fonts = [
                ("SimSun/宋体", ["simsun", "宋体", "songti"]),
                ("SimHei/黑体", ["simhei", "黑体", "heiti"]),
                ("KaiTi/楷体", ["kaiti", "楷体"]),
            ]

            for font_name, patterns in required_fonts:
                found = any(p in fonts_output for p in patterns)
                if found:
                    passed(f"Font: {font_name}")
                else:
                    warning(f"Font not found: {font_name}")

            # Count CJK fonts
            cjk_count = len([line for line in result.stdout.split('\n') if any(ord(c) > 0x4E00 for c in line)])
            info(f"  CJK fonts detected: ~{cjk_count}")

        except Exception as e:
            warning(f"Font check error: {e}")
    else:
        warning("Cannot check fonts (fc-list not available)")

    # ===========================================
    # 6. Template Fonts
    # ===========================================
    section("Template Fonts")

    script_dir = Path(__file__).parent
    templates_shared = script_dir.parent / "templates" / "shared"

    if templates_shared.exists():
        template_fonts = ["simsun.ttc", "simhei.ttf", "kaiti_GB2312.TTF"]
        for font in template_fonts:
            font_path = templates_shared / font
            if font_path.exists():
                size_mb = font_path.stat().st_size / (1024 * 1024)
                passed(f"Template font: {font} ({size_mb:.1f}MB)")
            else:
                warning(f"Template font missing: {font}")
    else:
        warning(f"Templates directory not found: {templates_shared}")

    # ===========================================
    # 7. Directory Permissions
    # ===========================================
    section("Directory Permissions")

    output_dir = script_dir.parent / "output"
    if output_dir.exists():
        if os.access(output_dir, os.W_OK):
            passed(f"Output directory writable")
        else:
            failed(f"Output directory not writable: {output_dir}")
    else:
        parent = output_dir.parent
        if os.access(parent, os.W_OK):
            passed("Can create output directory")
        else:
            failed("Cannot create output directory")

    if os.access("/tmp", os.W_OK):
        passed("/tmp writable")
    else:
        failed("/tmp not writable")

    # ===========================================
    # 8. Functional Test - PDF Extraction
    # ===========================================
    section("Functional Tests")

    try:
        import fitz
        # Create a test PDF in memory
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((100, 100), "Test 测试 テスト", fontsize=12)

        # Extract text
        text = page.get_text()
        if "Test" in text and "测试" in text:
            passed("PDF text extraction (including CJK)")
        else:
            warning("PDF text extraction partial")

        doc.close()
    except Exception as e:
        failed(f"PDF extraction test: {e}")

    # Test tectonic if available
    if shutil.which("tectonic"):
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.tex', delete=False) as f:
                f.write(r"\documentclass{article}\begin{document}Hello\end{document}")
                tex_path = f.name

            result = subprocess.run(
                ["tectonic", tex_path, "-o", "/tmp", "--keep-logs"],
                capture_output=True, timeout=60
            )

            pdf_path = tex_path.replace('.tex', '.pdf')
            if os.path.exists(f"/tmp/{os.path.basename(pdf_path)}"):
                passed("Tectonic compilation")
                os.remove(f"/tmp/{os.path.basename(pdf_path)}")
            else:
                warning("Tectonic ran but PDF not found")

            os.remove(tex_path)
        except subprocess.TimeoutExpired:
            warning("Tectonic compilation timed out")
        except Exception as e:
            failed(f"Tectonic test: {e}")

    # ===========================================
    # Summary
    # ===========================================
    print("\n" + "=" * 50)
    print("Summary")
    print("=" * 50)
    print(f"{Colors.GREEN}Passed:{Colors.END} {pass_count}")
    print(f"{Colors.RED}Failed:{Colors.END} {fail_count}")
    print(f"{Colors.YELLOW}Warnings:{Colors.END} {warn_count}")
    print()

    if fail_count == 0:
        print(f"{Colors.GREEN}Environment check completed successfully!{Colors.END}")
        return 0
    else:
        print(f"{Colors.RED}Environment has {fail_count} issue(s) that need to be fixed.{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

#!/bin/bash
#
# Environment Check Script for Thesis Formatter
# Run this script on the remote Linux server to verify all dependencies
#
# Usage: bash check_environment.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

info() {
    echo -e "      $1"
}

echo "========================================"
echo "Thesis Formatter Environment Check"
echo "========================================"
echo ""

# ===========================================
# 1. System Information
# ===========================================
echo "--- System Information ---"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    info "OS: $NAME $VERSION"
else
    info "OS: $(uname -s) $(uname -r)"
fi
info "Architecture: $(uname -m)"
info "Hostname: $(hostname)"
echo ""

# ===========================================
# 2. Node.js and npm
# ===========================================
echo "--- Node.js & npm ---"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    if [[ "$NODE_VERSION" =~ ^v(1[89]|[2-9][0-9])\. ]]; then
        pass "Node.js $NODE_VERSION (>= v18 required)"
    else
        warn "Node.js $NODE_VERSION (v18+ recommended)"
    fi
else
    fail "Node.js not found"
fi

if command -v npm &> /dev/null; then
    pass "npm $(npm --version)"
else
    fail "npm not found"
fi
echo ""

# ===========================================
# 3. Python Environment
# ===========================================
echo "--- Python Environment ---"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    pass "$PYTHON_VERSION"
else
    fail "Python3 not found"
fi

if command -v pip3 &> /dev/null; then
    pass "pip3 available"
else
    warn "pip3 not found (may use pip)"
fi

# Check Python packages
echo ""
echo "--- Python Packages ---"

check_python_package() {
    local package=$1
    local import_name=${2:-$1}
    if python3 -c "import $import_name" 2>/dev/null; then
        VERSION=$(python3 -c "import $import_name; print(getattr($import_name, '__version__', 'unknown'))" 2>/dev/null || echo "installed")
        pass "$package ($VERSION)"
    else
        fail "$package not installed"
        info "  Install with: pip3 install $package"
    fi
}

check_python_package "PyMuPDF" "fitz"
check_python_package "Pillow" "PIL"
check_python_package "python-docx" "docx"
echo ""

# ===========================================
# 4. LaTeX / Tectonic
# ===========================================
echo "--- LaTeX / Tectonic ---"
if command -v tectonic &> /dev/null; then
    TECTONIC_VERSION=$(tectonic --version 2>&1 | head -1)
    pass "Tectonic: $TECTONIC_VERSION"
else
    fail "Tectonic not found"
    info "  Install with: curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh"
    info "  Or: cargo install tectonic"
fi

# Check if xelatex is available as fallback
if command -v xelatex &> /dev/null; then
    XELATEX_VERSION=$(xelatex --version 2>&1 | head -1)
    pass "XeLaTeX (fallback): $XELATEX_VERSION"
else
    warn "XeLaTeX not found (optional fallback)"
fi
echo ""

# ===========================================
# 5. Fonts
# ===========================================
echo "--- Fonts ---"

# Check if fc-list is available
if ! command -v fc-list &> /dev/null; then
    warn "fontconfig (fc-list) not found, cannot check system fonts"
    info "  Install with: apt-get install fontconfig"
else
    check_font() {
        local font_name=$1
        local font_pattern=$2
        if fc-list | grep -qi "$font_pattern"; then
            pass "Font: $font_name"
        else
            fail "Font: $font_name not found"
        fi
    }

    # Chinese fonts
    check_font "SimSun (宋体)" "simsun\|SimSun\|宋体"
    check_font "SimHei (黑体)" "simhei\|SimHei\|黑体"
    check_font "KaiTi (楷体)" "kaiti\|KaiTi\|楷体"
    check_font "FangSong (仿宋)" "fangsong\|FangSong\|仿宋"

    # Check for any CJK fonts
    CJK_FONTS=$(fc-list :lang=zh 2>/dev/null | wc -l)
    if [ "$CJK_FONTS" -gt 0 ]; then
        info "  Total CJK fonts available: $CJK_FONTS"
    else
        warn "No CJK fonts found in system"
    fi
fi

# Check template fonts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FONTS_DIR="$SCRIPT_DIR/../templates/shared"
if [ -d "$TEMPLATE_FONTS_DIR" ]; then
    echo ""
    info "Template fonts directory: $TEMPLATE_FONTS_DIR"
    for font in simsun.ttc simhei.ttf kaiti_GB2312.TTF; do
        if [ -f "$TEMPLATE_FONTS_DIR/$font" ]; then
            pass "Template font: $font"
        else
            warn "Template font missing: $font"
        fi
    done
else
    warn "Template fonts directory not found: $TEMPLATE_FONTS_DIR"
fi
echo ""

# ===========================================
# 6. Directory Permissions
# ===========================================
echo "--- Directory Permissions ---"
OUTPUT_DIR="$SCRIPT_DIR/../output"
if [ -d "$OUTPUT_DIR" ]; then
    if [ -w "$OUTPUT_DIR" ]; then
        pass "Output directory writable: $OUTPUT_DIR"
    else
        fail "Output directory not writable: $OUTPUT_DIR"
    fi
else
    info "Output directory does not exist (will be created): $OUTPUT_DIR"
    PARENT_DIR=$(dirname "$OUTPUT_DIR")
    if [ -w "$PARENT_DIR" ]; then
        pass "Parent directory writable"
    else
        fail "Cannot create output directory (parent not writable)"
    fi
fi

# Check temp directory
if [ -w "/tmp" ]; then
    pass "/tmp directory writable"
else
    fail "/tmp directory not writable"
fi
echo ""

# ===========================================
# 7. Memory and Disk
# ===========================================
echo "--- System Resources ---"
# Memory
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
    if [ "$AVAIL_MEM" -gt 1024 ]; then
        pass "Available memory: ${AVAIL_MEM}MB / ${TOTAL_MEM}MB total"
    else
        warn "Low available memory: ${AVAIL_MEM}MB (1GB+ recommended)"
    fi
fi

# Disk space
if command -v df &> /dev/null; then
    DISK_AVAIL=$(df -m . | awk 'NR==2{print $4}')
    if [ "$DISK_AVAIL" -gt 5120 ]; then
        pass "Available disk space: ${DISK_AVAIL}MB"
    else
        warn "Low disk space: ${DISK_AVAIL}MB (5GB+ recommended)"
    fi
fi
echo ""

# ===========================================
# 8. Test PDF Extraction
# ===========================================
echo "--- Functional Tests ---"
EXTRACT_SCRIPT="$SCRIPT_DIR/extract_pdf.py"
if [ -f "$EXTRACT_SCRIPT" ]; then
    # Create a simple test
    TEST_OUTPUT=$(python3 -c "
import sys
sys.path.insert(0, '$(dirname "$EXTRACT_SCRIPT")')
try:
    import fitz
    print('PyMuPDF import: OK')
except ImportError as e:
    print(f'PyMuPDF import: FAIL - {e}')
    sys.exit(1)
" 2>&1)
    if [ $? -eq 0 ]; then
        pass "PDF extraction module loadable"
    else
        fail "PDF extraction module failed: $TEST_OUTPUT"
    fi
else
    warn "extract_pdf.py not found at $EXTRACT_SCRIPT"
fi

# Test tectonic compilation
if command -v tectonic &> /dev/null; then
    TEMP_TEX=$(mktemp /tmp/test_XXXXXX.tex)
    cat > "$TEMP_TEX" << 'EOF'
\documentclass{article}
\begin{document}
Hello World
\end{document}
EOF
    if tectonic "$TEMP_TEX" -o /tmp --keep-logs 2>/dev/null; then
        pass "Tectonic compilation test"
        rm -f "${TEMP_TEX%.tex}.pdf" 2>/dev/null
    else
        fail "Tectonic compilation test failed"
    fi
    rm -f "$TEMP_TEX" 2>/dev/null
fi
echo ""

# ===========================================
# Summary
# ===========================================
echo "========================================"
echo "Summary"
echo "========================================"
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}Environment check completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}Environment has $FAIL_COUNT issue(s) that need to be fixed.${NC}"
    exit 1
fi

#!/usr/bin/env python3
"""
PDF extraction script using PyMuPDF (fitz)
Extracts text with image position markers for LLM processing
"""

import sys
import json
import os
import re
import fitz  # PyMuPDF

# Unicode math symbols that indicate potential formulas
UNICODE_MATH_CHARS = set('𝛼𝛽𝛾𝛿𝜀𝜁𝜂𝜃𝜄𝜅𝜆𝜇𝜈𝜉𝜊𝜋𝜌𝜎𝜏𝜐𝜑𝜒𝜓𝜔'
                         '𝛢𝛣𝛤𝛥𝛦𝛧𝛨𝛩𝛪𝛫𝛬𝛭𝛮𝛯𝛰𝛱𝛲𝛳𝛴𝛵𝛶𝛷𝛸𝛹𝛺'
                         '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'
                         '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍'
                         '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎'
                         '∑∏∫∬∭∮∯∰∇∂∆∀∃∈∉⊂⊃⊆⊇∪∩∧∨¬⊕⊗⊙'
                         '≤≥≠≈≡≢∝∞±×÷√∛∜')

def mark_formulas(text: str) -> str:
    """
    Detect and mark potential formulas containing Unicode math symbols.
    This helps the LLM identify formulas that need conversion to LaTeX.
    """
    lines = text.split('\n')
    result = []

    for line in lines:
        # Count Unicode math characters in this line
        math_count = sum(1 for c in line if c in UNICODE_MATH_CHARS)

        # If line contains significant Unicode math, mark it as a formula
        if math_count >= 3 or (math_count >= 1 and any(c in line for c in '∑∏∫∂∇')):
            # Find the formula portion (continuous text with math symbols)
            # Look for sequences containing math symbols
            marked_line = line
            # Simple heuristic: if we have math symbols, wrap the whole content
            # The LLM will clean this up
            if not line.strip().startswith('[FORMULA:'):
                marked_line = f'[FORMULA: {line.strip()} :END_FORMULA]'
            result.append(marked_line)
        else:
            result.append(line)

    return '\n'.join(result)


def detect_table_structure(text: str) -> str:
    """
    Detect potential table data based on patterns:
    - Multiple numbers/values separated by spaces on a line
    - Lines with consistent columnar structure
    """
    lines = text.split('\n')
    result = []
    table_buffer = []
    in_potential_table = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Check if this looks like a table row
        # Pattern: multiple words/numbers with spacing that could be columns
        parts = stripped.split()

        # Heuristic: 3+ columns of data, with at least one numeric value
        has_numbers = any(re.match(r'^[\d,.]+$', p) for p in parts)
        looks_like_table_row = len(parts) >= 3 and has_numbers

        if looks_like_table_row:
            if not in_potential_table:
                in_potential_table = True
            table_buffer.append(stripped)
        else:
            if in_potential_table and len(table_buffer) >= 2:
                # Mark the buffered content as a table
                result.append('[TABLE_START]')
                for row in table_buffer:
                    result.append(f'[TABLE_ROW: {row}]')
                result.append('[TABLE_END]')
                table_buffer = []
            elif table_buffer:
                # Not enough rows to be a table, just output normally
                result.extend(table_buffer)
                table_buffer = []
            in_potential_table = False
            result.append(line)

    # Handle remaining buffer
    if len(table_buffer) >= 2:
        result.append('[TABLE_START]')
        for row in table_buffer:
            result.append(f'[TABLE_ROW: {row}]')
        result.append('[TABLE_END]')
    elif table_buffer:
        result.extend(table_buffer)

    return '\n'.join(result)


def extract_pdf_with_layout(pdf_path: str, output_dir: str) -> dict:
    """
    Extract PDF content with image position information.

    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save extracted images

    Returns:
        dict with text_with_images and images list
    """
    doc = fitz.open(pdf_path)
    result = {
        "text_with_images": "",
        "images": []
    }

    image_counter = 0

    for page_num, page in enumerate(doc):
        # Get all blocks (text and images)
        blocks = page.get_text("dict")["blocks"]

        # Get image info with xrefs for extraction
        image_info_list = page.get_image_info(xrefs=True)

        # Create a mapping of bbox to image info
        # Use center point for matching
        image_map = {}
        for img_info in image_info_list:
            bbox = img_info["bbox"]
            center_y = (bbox[1] + bbox[3]) / 2
            image_map[center_y] = img_info

        # Sort blocks by y coordinate (top to bottom)
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])

        for block in sorted_blocks:
            bbox = block["bbox"]

            if block["type"] == 0:  # Text block
                block_text = ""
                for line in block["lines"]:
                    line_text = ""
                    for span in line["spans"]:
                        line_text += span["text"]
                    block_text += line_text + "\n"
                result["text_with_images"] += block_text

            elif block["type"] == 1:  # Image block
                image_counter += 1
                img_id = f"pdfimg{image_counter}"

                # Try to find matching image info by bbox proximity
                block_center_y = (bbox[1] + bbox[3]) / 2
                matched_img = None
                min_distance = float('inf')

                for center_y, img_info in image_map.items():
                    distance = abs(center_y - block_center_y)
                    if distance < min_distance and distance < 50:  # 50pt tolerance
                        min_distance = distance
                        matched_img = img_info

                # Extract and save image
                if matched_img and matched_img.get("xref", 0) > 0:
                    try:
                        xref = matched_img["xref"]
                        img_data = doc.extract_image(xref)
                        ext = img_data.get("ext", "png")
                        filename = f"{img_id}.{ext}"
                        img_path = os.path.join(output_dir, filename)

                        with open(img_path, "wb") as f:
                            f.write(img_data["image"])

                        result["images"].append({
                            "id": img_id,
                            "filename": filename,
                            "page": page_num + 1,
                            "bbox": list(bbox)
                        })

                        # Insert image marker in text
                        result["text_with_images"] += f"\n[FIGURE:{img_id}]\n"

                    except Exception as e:
                        # If extraction fails, still add marker but note the error
                        result["text_with_images"] += f"\n[FIGURE:{img_id}:extraction_failed]\n"
                        sys.stderr.write(f"Warning: Failed to extract image {img_id}: {e}\n")
                else:
                    # Image block found but no xref match
                    result["text_with_images"] += f"\n[FIGURE:{img_id}:no_xref]\n"

        # Add page separator
        if page_num < len(doc) - 1:
            result["text_with_images"] += "\n\n"

    doc.close()

    # Post-process to mark formulas and tables
    result["text_with_images"] = mark_formulas(result["text_with_images"])
    result["text_with_images"] = detect_table_structure(result["text_with_images"])

    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf.py <pdf_path> <output_dir>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    try:
        result = extract_pdf_with_layout(pdf_path, output_dir)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

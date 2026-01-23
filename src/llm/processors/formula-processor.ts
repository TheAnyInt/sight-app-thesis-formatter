/**
 * Unicode math character mappings to LaTeX
 */
const UNICODE_TO_LATEX: Record<string, string> = {
  // Greek letters (italic)
  '𝛼': '\\alpha', '𝛽': '\\beta', '𝛾': '\\gamma', '𝛿': '\\delta',
  '𝜀': '\\epsilon', '𝜁': '\\zeta', '𝜂': '\\eta', '𝜃': '\\theta',
  '𝜄': '\\iota', '𝜅': '\\kappa', '𝜆': '\\lambda', '𝜇': '\\mu',
  '𝜈': '\\nu', '𝜉': '\\xi', '𝜊': 'o', '𝜋': '\\pi',
  '𝜌': '\\rho', '𝜎': '\\sigma', '𝜏': '\\tau', '𝜐': '\\upsilon',
  '𝜑': '\\phi', '𝜒': '\\chi', '𝜓': '\\psi', '𝜔': '\\omega',
  // Greek letters (uppercase)
  '𝛢': 'A', '𝛣': 'B', '𝛤': '\\Gamma', '𝛥': '\\Delta',
  '𝛦': 'E', '𝛧': 'Z', '𝛨': 'H', '𝛩': '\\Theta',
  '𝛪': 'I', '𝛫': 'K', '𝛬': '\\Lambda', '𝛭': 'M',
  '𝛮': 'N', '𝛯': '\\Xi', '𝛰': 'O', '𝛱': '\\Pi',
  '𝛲': 'P', '𝛳': '\\Sigma', '𝛴': '\\Sigma', '𝛵': 'T',
  '𝛶': '\\Upsilon', '𝛷': '\\Phi', '𝛸': 'X', '𝛹': '\\Psi', '𝛺': '\\Omega',
  // Math italic letters
  '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f',
  '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l',
  '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r',
  '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x',
  '𝑦': 'y', '𝑧': 'z',
  '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F',
  '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L',
  '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R',
  '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X',
  '𝑌': 'Y', '𝑍': 'Z',
  // Math operators and symbols
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '∇': '\\nabla', '∂': '\\partial', '∆': '\\Delta',
  '∀': '\\forall', '∃': '\\exists', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg',
  '⊕': '\\oplus', '⊗': '\\otimes', '⊙': '\\odot',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '≢': '\\not\\equiv', '∝': '\\propto', '∞': '\\infty',
  '±': '\\pm', '×': '\\times', '÷': '\\div', '√': '\\sqrt',
  '∛': '\\sqrt[3]', '∜': '\\sqrt[4]',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  // Superscripts
  '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
  '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
  '⁺': '^{+}', '⁻': '^{-}', '⁼': '^{=}', '⁽': '^{(}', '⁾': '^{)}',
  'ⁿ': '^{n}', 'ⁱ': '^{i}',
  // Subscripts
  '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}', '₄': '_{4}',
  '₅': '_{5}', '₆': '_{6}', '₇': '_{7}', '₈': '_{8}', '₉': '_{9}',
  '₊': '_{+}', '₋': '_{-}', '₌': '_{=}', '₍': '_{(}', '₎': '_{)}',
  'ₐ': '_{a}', 'ₑ': '_{e}', 'ₒ': '_{o}', 'ₓ': '_{x}',
  'ₕ': '_{h}', 'ₖ': '_{k}', 'ₗ': '_{l}', 'ₘ': '_{m}',
  'ₙ': '_{n}', 'ₚ': '_{p}', 'ₛ': '_{s}', 'ₜ': '_{t}',
  'ᵢ': '_{i}', 'ⱼ': '_{j}',
};

/**
 * Sets of Unicode math characters for pattern matching
 */
const UNICODE_UPPER_LIMITS = new Set(['𝑁', '𝑀', '𝐾', '𝑛', '𝑚', '𝑘', 'N', 'M', 'K', 'n', 'm', 'k']);
const UNICODE_LHS_VARS = new Set(['𝐿', '𝑅', '𝐸', '𝐽', '𝑃', '𝑄', 'L', 'R', 'E', 'J', 'P', 'Q', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);
const UNICODE_INDEX_VARS = new Set(['𝑖', '𝑗', '𝑘', 'i', 'j', 'k']);
const SUM_PROD_SYMBOLS = new Set(['∑', '∏']);

/**
 * Formula processing utilities for converting Unicode math to LaTeX
 */
export class FormulaProcessor {
  /**
   * Check if a character is a Unicode math character
   */
  private static isUnicodeMathChar(char: string): boolean {
    return UNICODE_TO_LATEX.hasOwnProperty(char);
  }

  /**
   * Convert Unicode characters to LaTeX in a string
   */
  private static convertUnicodeChars(text: string): string {
    let result = text;
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      result = result.split(unicode).join(latex);
    }
    return result;
  }

  /**
   * Convert a formula block to LaTeX
   * Handles patterns like "N ∑ L= − i=1 yilog(pi)"
   */
  private static convertFormulaBlockToLatex(content: string): string {
    // First convert all Unicode chars
    let formula = this.convertUnicodeChars(content);

    // Try to detect and reconstruct common formula patterns

    // Pattern 1: Sum formula "N \sum L= − i=1 body" (space-joined format)
    // More flexible pattern that handles various spacing
    const sumPattern = /([NMKnmk])\s+\\sum\s+([A-Za-z])\s*=\s*[-−]?\s*([ijk])\s*=\s*(\d+)\s+(.+)/;
    const sumMatch = formula.match(sumPattern);
    if (sumMatch) {
      const [_, upper, lhs, idx, start, body] = sumMatch;
      return `$$${lhs} = -\\sum_{${idx}=${start}}^{${upper}} ${body}$$`;
    }

    // Pattern 2: Product formula (space-joined format)
    const prodPattern = /([NMKnmk])\s+\\prod\s+([A-Za-z])\s*=\s*([ijk])\s*=\s*(\d+)\s+(.+)/;
    const prodMatch = formula.match(prodPattern);
    if (prodMatch) {
      const [_, upper, lhs, idx, start, body] = prodMatch;
      return `$$${lhs} = \\prod_{${idx}=${start}}^{${upper}} ${body}$$`;
    }

    // Pattern 3: Simple equation with operators
    if (/[A-Za-z]\s*=\s*[-+]?.*\\(?:sum|prod|int|frac)/.test(formula)) {
      return `$$${formula}$$`;
    }

    // If no pattern matched, wrap in $$ if it has LaTeX commands
    if (/\\(?:sum|prod|int|frac|alpha|beta|gamma)/.test(formula)) {
      return `$$${formula}$$`;
    }

    // Otherwise, make inline math
    if (formula.includes('=') || /[_^]/.test(formula)) {
      return `$${formula}$`;
    }

    return formula;
  }

  /**
   * Convert Unicode math characters to LaTeX
   */
  static convertUnicodeMathToLatex(content: string): string {
    let result = content;

    // Handle [FORMULA_BLOCK: ... :END_FORMULA_BLOCK] markers (multi-line formulas)
    // These are already properly formatted, so protect them with a placeholder
    const displayMathPlaceholders: string[] = [];
    result = result.replace(/\[FORMULA_BLOCK:\s*([\s\S]*?)\s*:END_FORMULA_BLOCK\]/g, (match, formulaContent) => {
      const converted = this.convertFormulaBlockToLatex(formulaContent);
      displayMathPlaceholders.push(converted);
      return `<<<DISPLAY_MATH_${displayMathPlaceholders.length - 1}>>>`;
    });

    // Handle [FORMULA: ... :END_FORMULA] markers (single-line formulas)
    result = result.replace(/\[FORMULA:\s*([\s\S]*?)\s*:END_FORMULA\]/g, (match, formulaContent) => {
      // Convert Unicode characters first
      let converted = formulaContent;
      for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
        converted = converted.split(unicode).join(latex);
      }

      // Check if it looks like an equation
      if (converted.includes('=') || /\\(?:sum|prod|int|frac)/.test(converted)) {
        return `$${converted}$`;
      }
      return converted;
    });

    // Convert remaining Unicode math characters
    for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
      result = result.split(unicode).join(latex);
    }

    // Fix common patterns that result from PDF extraction
    // Pattern: "L = -\sum_{i=1}^{N}" should be wrapped in $$ if it's a standalone formula
    result = result.replace(/^(\s*)(\\?[A-Za-z]+\s*=\s*[-+]?\\(?:sum|prod|int|frac)[^$\n]+)(\s*)$/gm, (match, pre, formula, post) => {
      // Check if it looks like a display formula (has sum/prod/int)
      if (/\\(?:sum|prod|int|frac)/.test(formula)) {
        return `${pre}$$${formula.trim()}$$${post}`;
      }
      return match;
    });

    // Wrap inline math that has LaTeX commands but no delimiters
    result = result.replace(/(?<![$\\])\\(alpha|beta|gamma|delta|sum|prod|int|frac|sqrt)(?![a-zA-Z])/g, (match) => {
      return `$${match}$`;
    });

    // Fix subscripts/superscripts that are not in math mode
    result = result.replace(/(?<!\$)([a-zA-Z])_\{([^}]+)\}(?!\$)/g, '$$$1_{$2}$$');
    result = result.replace(/(?<!\$)([a-zA-Z])\^\{([^}]+)\}(?!\$)/g, '$$$1^{$2}$$');

    // Clean up adjacent inline math - merge $a$$b$ into $ab$
    // Be careful not to corrupt display math $$...$$
    // Only remove truly empty inline math like "$ $" or "$  $" (with spaces inside)
    result = result.replace(/\$\s+\$/g, '');
    // Remove $$ that appears between inline math expressions (like $a$$$b$ -> $a$$b$)
    // But preserve $$ at start/end of display math
    result = result.replace(/([^$])\$\$\$([^$])/g, '$1$ $$2');

    // Fix mixed math delimiters - remove $ inside \[...\] or $$...$$
    result = result.replace(/\\\[\s*\$([^$]+)\$\s*\\\]/g, '\\[$1\\]');
    result = result.replace(/\$\$\s*\$([^$]+)\$\s*\$\$/g, '$$$1$$');

    // Fix \sum, \prod, etc. that have extra $ wrapping
    result = result.replace(/\$\\(sum|prod|int|frac|log)\$/g, '\\$1');

    // Handle corrupted formula patterns like "\sum= −=1log()" that need math mode wrapping
    // These occur when PDF extraction corrupts formula structure
    result = result.replace(/(?<!\$)(\\(?:sum|prod|int)[^$\n]*(?:log|exp|sin|cos|tan)?\([^)]*\))(?!\$)/g, (match) => {
      return `$${match}$`;
    });

    // Also wrap standalone \sum, \prod, \int with = that aren't in math mode
    result = result.replace(/(?<!\$)(\\(?:sum|prod|int)=\s*[-−]?[^$\n]+)(?!\$)/g, (match) => {
      return `$${match}$`;
    });

    // Restore display math placeholders
    // Use a function as replacement to avoid $$ being interpreted as escape sequence
    for (let i = 0; i < displayMathPlaceholders.length; i++) {
      result = result.replace(`<<<DISPLAY_MATH_${i}>>>`, () => displayMathPlaceholders[i]);
    }

    return result;
  }

  /**
   * Reconstruct fragmented formulas from PDF extraction
   * PDF often splits formulas across multiple lines
   */
  static reconstructFormulas(content: string): string {
    let result = content;

    // Split content into lines for analysis
    const lines = result.split('\n');
    const reconstructed: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Check if this line starts a potential formula pattern
      // Pattern: upper_limit, sum/prod symbol, lhs=, index=num, body
      if (UNICODE_UPPER_LIMITS.has(line) && i + 4 < lines.length) {
        const line2 = lines[i + 1].trim();
        const line3 = lines[i + 2].trim();
        const line4 = lines[i + 3].trim();
        const line5 = lines[i + 4].trim();

        // Check if line2 is sum or product symbol
        if (SUM_PROD_SYMBOLS.has(line2)) {
          // Check if line3 looks like "L= −" or "L=" (use 'u' flag for Unicode)
          const lhsMatch = line3.match(/^(.)=\s*([-−]?)\s*$/u);
          // Check if line4 looks like "i=1" (use 'u' flag for Unicode)
          const indexMatch = line4.match(/^(.)=(\d+)$/u);

          if (lhsMatch && indexMatch) {
            // We found a formula pattern!
            const upper = this.convertUnicodeChars(line);
            const operator = line2 === '∑' ? '\\sum' : '\\prod';
            const lhs = this.convertUnicodeChars(lhsMatch[1]);
            const hasMinus = lhsMatch[2] === '−' || lhsMatch[2] === '-';
            const idx = this.convertUnicodeChars(indexMatch[1]);
            const start = indexMatch[2];
            const body = this.convertUnicodeChars(line5);

            const sign = hasMinus ? '-' : '';
            reconstructed.push(`$$${lhs} = ${sign}${operator}_{${idx}=${start}}^{${upper}} ${body}$$`);
            i += 5;
            continue;
          }
        }
      }

      // Also check for ASCII variants
      if (['N', 'M', 'K', 'n', 'm', 'k'].includes(line) && i + 4 < lines.length) {
        const line2 = lines[i + 1].trim();
        const line3 = lines[i + 2].trim();
        const line4 = lines[i + 3].trim();
        const line5 = lines[i + 4].trim();

        if (line2 === '∑' || line2 === '∏') {
          const lhsMatch = line3.match(/^([A-Za-z])=\s*([-−]?)\s*$/);
          const indexMatch = line4.match(/^([ijk])=(\d+)$/);

          if (lhsMatch && indexMatch) {
            const operator = line2 === '∑' ? '\\sum' : '\\prod';
            const hasMinus = lhsMatch[2] === '−' || lhsMatch[2] === '-';
            const sign = hasMinus ? '-' : '';
            reconstructed.push(`$$${lhsMatch[1]} = ${sign}${operator}_{${indexMatch[1]}=${indexMatch[2]}}^{${line}} ${line5}$$`);
            i += 5;
            continue;
          }
        }
      }

      // No formula pattern found, keep the line as is
      reconstructed.push(lines[i]);
      i++;
    }

    return reconstructed.join('\n');
  }
}

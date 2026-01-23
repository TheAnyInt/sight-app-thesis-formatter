import { FormulaProcessor } from './formula-processor';

describe('FormulaProcessor', () => {
  describe('convertUnicodeMathToLatex', () => {
    it('should convert Greek letters', () => {
      const input = '𝛼 + 𝛽 = 𝛾';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('\\alpha');
      expect(result).toContain('\\beta');
      expect(result).toContain('\\gamma');
    });

    it('should convert math operators', () => {
      const input = '∑ ∏ ∫ ∞';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('\\sum');
      expect(result).toContain('\\prod');
      expect(result).toContain('\\int');
      expect(result).toContain('\\infty');
    });

    it('should convert superscripts', () => {
      const input = 'x² + y³';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('^{2}');
      expect(result).toContain('^{3}');
    });

    it('should convert subscripts', () => {
      const input = 'x₁ + x₂';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('_{1}');
      expect(result).toContain('_{2}');
    });

    it('should convert comparison operators', () => {
      const input = 'a ≤ b ≥ c ≠ d';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('\\leq');
      expect(result).toContain('\\geq');
      expect(result).toContain('\\neq');
    });

    it('should handle [FORMULA: ... :END_FORMULA] markers', () => {
      const input = '[FORMULA: 𝑥 = 𝑦 :END_FORMULA]';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('$');
      expect(result).toContain('x');
      expect(result).toContain('y');
      expect(result).not.toContain('[FORMULA:');
    });

    it('should handle [FORMULA_BLOCK: ... :END_FORMULA_BLOCK] markers', () => {
      const input = '[FORMULA_BLOCK: ∑ 𝑖 = 1 :END_FORMULA_BLOCK]';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).not.toContain('[FORMULA_BLOCK:');
      expect(result).toContain('\\sum');
    });

    it('should convert math italic letters', () => {
      const input = '𝑥𝑦𝑧';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toBe('xyz');
    });

    it('should handle mixed content', () => {
      const input = '其中 𝛼 是学习率，𝛽 是动量';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('\\alpha');
      expect(result).toContain('\\beta');
      expect(result).toContain('其中');
      expect(result).toContain('是学习率');
    });

    it('should handle arrows', () => {
      const input = '→ ← ↔ ⇒ ⇐';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('\\rightarrow');
      expect(result).toContain('\\leftarrow');
      expect(result).toContain('\\leftrightarrow');
      expect(result).toContain('\\Rightarrow');
      expect(result).toContain('\\Leftarrow');
    });
  });

  describe('reconstructFormulas', () => {
    it('should handle content without formulas', () => {
      const input = '这是普通文本，没有公式';
      const result = FormulaProcessor.reconstructFormulas(input);

      expect(result).toBe(input);
    });

    it('should preserve text that does not match reconstruction patterns', () => {
      const input = '前文\n一些数学符号 ∑ ∏\n后文';
      const result = FormulaProcessor.reconstructFormulas(input);

      expect(result).toContain('前文');
      expect(result).toContain('后文');
      expect(result).toContain('∑');
    });

    it('should not modify inline formulas', () => {
      const input = '公式 $$L = \\sum_{i=1}^{N} y_i$$ 是损失函数';
      const result = FormulaProcessor.reconstructFormulas(input);

      expect(result).toBe(input);
    });

    it('should reconstruct sum formula split across 5 lines (bug #6 case)', () => {
      // This is the exact pattern from the bug report
      const input = '𝑁\n∑\n𝐿= −\n𝑖=1\n𝑦𝑖log(𝑝𝑖)';
      const result = FormulaProcessor.reconstructFormulas(input);

      // Should produce a proper LaTeX sum formula
      expect(result).toContain('$$');
      expect(result).toContain('\\sum');
      expect(result).toContain('_{');
      expect(result).toContain('^{');
    });

    it('should reconstruct sum formula with regular ASCII characters', () => {
      const input = 'N\n∑\nL= -\ni=1\nylog(p)';
      const result = FormulaProcessor.reconstructFormulas(input);

      expect(result).toContain('$$');
      expect(result).toContain('\\sum');
    });

    it('should reconstruct product formula split across lines', () => {
      const input = '𝑁\n∏\n𝑃=\n𝑖=1\n𝑥𝑖';
      const result = FormulaProcessor.reconstructFormulas(input);

      expect(result).toContain('$$');
      expect(result).toContain('\\prod');
    });

    it('should handle FORMULA_BLOCK with space-joined content', () => {
      // When PDF extraction joins formula lines with spaces
      const input = '[FORMULA_BLOCK: 𝑁 ∑ 𝐿= − 𝑖=1 𝑦𝑖log(𝑝𝑖) :END_FORMULA_BLOCK]';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      expect(result).toContain('$$');
      expect(result).toContain('\\sum');
      expect(result).not.toContain('[FORMULA_BLOCK:');
    });

    it('should handle corrupted formula pattern like ∑= −=1log()', () => {
      // This is the corrupted pattern mentioned in the bug
      const input = '∑= −=1log()';
      const result = FormulaProcessor.convertUnicodeMathToLatex(input);

      // Should at least convert the sum symbol and wrap in math mode
      expect(result).toContain('\\sum');
      expect(result).toMatch(/\$.*\\sum.*\$/);
    });
  });
});

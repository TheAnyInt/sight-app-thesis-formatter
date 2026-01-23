import { Logger } from '@nestjs/common';

const logger = new Logger('TableProcessor');

/**
 * Table processing utilities for converting various table formats to LaTeX
 */
export class TableProcessor {
  // Strategy 1: Multi-language header detection (Chinese, English, or mixed)
  private static detectHeaderColumns(cells: string[]): { numCols: number; confidence: number } {
    const isHeaderCandidate = (cell: string): boolean => {
      if (cell.length > 12) return false;  // Headers are typically short
      if (/^[\d,.\-+%]+$/.test(cell)) return false;  // Pure numeric = data
      if (/^[A-Z]{2,}\-?\d+$/.test(cell)) return false;  // Dataset names like CIFAR-10
      // Mixed Chinese + alphanumeric is likely data (e.g., "项目A"), not header
      if (/[\u4e00-\u9fa5]/.test(cell) && /[a-zA-Z0-9]/.test(cell)) return false;
      // CamelCase patterns are likely model/data names, not headers (e.g., ResNet, ModelA)
      if (/[a-z][A-Z]/.test(cell)) return false;
      // Words ending with uppercase after lowercase (e.g., ModelA) are data
      if (/[a-z][A-Z]$/.test(cell)) return false;
      // Accept pure Chinese, pure English words, or short identifiers like "F1"
      return /^[\u4e00-\u9fa5]+$/.test(cell) || /^[A-Za-z][A-Za-z0-9]*$/.test(cell);
    };

    let headerCount = 0;
    for (const cell of cells) {
      if (isHeaderCandidate(cell)) {
        headerCount++;
        if (headerCount > 8) break;
      } else {
        break;
      }
    }

    if (headerCount >= 2 && headerCount <= 8) {
      const expectedRows = Math.floor(cells.length / headerCount);
      if (expectedRows >= 2 && cells.length % headerCount === 0) {
        return { numCols: headerCount, confidence: 0.9 };
      }
      return { numCols: headerCount, confidence: 0.6 };
    }
    return { numCols: 0, confidence: 0 };
  }

  // Strategy 2: Detect by cell type patterns (text, number, identifier)
  private static detectByPattern(cells: string[]): { numCols: number; confidence: number } {
    const getCellType = (cell: string): string => {
      if (/^[\d,.\-+%]+$/.test(cell)) return 'num';
      if (/^[\u4e00-\u9fa5]+$/.test(cell)) return 'chn';
      if (/^[a-zA-Z][\w\-]*$/.test(cell)) return 'id';
      return 'mix';
    };

    // All-numeric cells = ambiguous structure, don't try to detect
    const hasNonNumeric = cells.some(c => getCellType(c) !== 'num');
    if (!hasNonNumeric) return { numCols: 0, confidence: 0 };

    // Find repeating type patterns
    for (let stride = 2; stride <= 8; stride++) {
      let matches = 0;
      for (let i = 0; i + stride < cells.length; i++) {
        if (getCellType(cells[i]) === getCellType(cells[i + stride])) matches++;
      }
      const total = cells.length - stride;
      if (total > 0 && matches / total > 0.6) {
        return { numCols: stride, confidence: matches / total * 0.8 };
      }
    }
    return { numCols: 0, confidence: 0 };
  }
  /**
   * Convert markdown tables to LaTeX tabular format
   * This is a fallback in case the LLM doesn't convert them
   */
  static convertMarkdownTablesToLatex(content: string): string {
    // Match markdown table pattern: | col1 | col2 | ... followed by |---|---| separator
    const tableRegex = /(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n?)+)/g;

    return content.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
      try {
        // Parse header
        const headers = headerRow.split('|').filter((h: string) => h.trim()).map((h: string) => h.trim());
        const numCols = headers.length;

        if (numCols === 0) return match;

        // Parse body rows
        const rows: string[][] = [];
        const bodyLines = bodyRows.trim().split('\n');
        for (const line of bodyLines) {
          const cells = line.split('|').filter((c: string) => c.trim() !== '' || c === '').slice(0, -1);
          // Skip empty lines
          if (cells.length > 0 && cells.some((c: string) => c.trim())) {
            // Pad or trim to match header columns
            const row = cells.slice(cells[0] === '' ? 1 : 0).map((c: string) => c.trim());
            if (row.length > 0) {
              rows.push(row);
            }
          }
        }

        // Build LaTeX table
        const colSpec = '|' + 'c|'.repeat(numCols);
        let latex = '\\begin{table}[H]\n\\centering\n';
        latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;
        latex += headers.join(' & ') + ' \\\\\\\\ \\hline\n';
        for (const row of rows) {
          // Ensure row has correct number of columns
          while (row.length < numCols) row.push('');
          latex += row.slice(0, numCols).join(' & ') + ' \\\\\\\\ \\hline\n';
        }
        latex += '\\end{tabular}\n\\end{table}';

        return latex;
      } catch (e) {
        logger.warn(`Failed to convert markdown table: ${e}`);
        return match;
      }
    });
  }

  /**
   * Convert [TABLE_CELL:] format from PDF extraction to LaTeX
   */
  static convertTableCellsToLatex(content: string): string {
    // Match [TABLE_START]...[TABLE_END] blocks
    const tableBlockRegex = /\[TABLE_START\]\n([\s\S]*?)\[TABLE_END\]/g;

    return content.replace(tableBlockRegex, (match, cellsContent) => {
      try {
        // Extract all cells
        const cellRegex = /\[TABLE_CELL:\s*([^\]]+)\]/g;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(cellsContent)) !== null) {
          cells.push(cellMatch[1].trim());
        }

        if (cells.length < 4) return match; // Not enough cells for a table

        // Try multiple detection strategies
        const strategies = [
          this.detectHeaderColumns(cells),
          this.detectByPattern(cells),
        ];

        const best = strategies
          .filter(s => s.confidence > 0.5)
          .sort((a, b) => b.confidence - a.confidence)[0];

        if (!best) {
          logger.warn('Column detection failed, preserving original markers');
          return match;  // Keep original instead of guessing
        }

        const numCols = best.numCols;

        // Validate reconstructed table
        const rows: string[][] = [];
        for (let i = 0; i < cells.length; i += numCols) {
          const row = cells.slice(i, i + numCols);
          if (row.length === numCols) {
            rows.push(row);
          }
        }

        // Validation: need header + at least 1 data row
        if (rows.length < 2) {
          logger.warn('Table too small after reconstruction');
          return match;
        }

        // Validation: check we didn't lose too many cells
        const usedCells = rows.length * numCols;
        if (usedCells < cells.length * 0.8) {
          logger.warn(`Lost ${cells.length - usedCells} cells, preserving original`);
          return match;
        }

        // Validation: header row should have at least one non-numeric cell
        const isNumeric = (cell: string) => /^[\d,.\-+%]+$/.test(cell);
        const hasTextHeader = rows[0].some(cell => !isNumeric(cell));
        if (!hasTextHeader) {
          logger.warn('No text headers found, preserving original');
          return match;
        }

        // Build LaTeX table
        const colSpec = '|' + 'c|'.repeat(numCols);
        let latex = '\\begin{table}[H]\n\\centering\n';
        latex += `\\begin{tabular}{${colSpec}}\n\\hline\n`;

        // Header row
        latex += rows[0].join(' & ') + ' \\\\\\\\ \\hline\n';

        // Data rows
        for (let i = 1; i < rows.length; i++) {
          latex += rows[i].join(' & ') + ' \\\\\\\\ \\hline\n';
        }

        latex += '\\end{tabular}\n\\end{table}';
        return latex;
      } catch (e) {
        logger.warn(`Failed to convert TABLE_CELL format: ${e}`);
        return match;
      }
    });
  }
}

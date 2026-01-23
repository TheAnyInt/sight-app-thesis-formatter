import { Logger } from '@nestjs/common';
import { DocumentStructure } from './structure-extractor';

/**
 * A chunk of content to be processed by the LLM
 */
export interface ContentChunk {
  sections: Array<{
    title: string;
    level: 1 | 2 | 3;
    content: string;
  }>;
  chunkIndex: number;
  totalChunks: number;
  includesAbstract?: boolean;
  includesReferences?: boolean;
  includesAcknowledgements?: boolean;
  abstractContent?: string;
  referencesContent?: string;
  acknowledgementsContent?: string;
}

const MAX_CHUNK_SIZE = 40000; // Characters per chunk
const logger = new Logger('ContentSplitter');

/**
 * Remove section header from content start to prevent duplicate output
 * Handles patterns: 第X章 标题、1.1 标题、Chapter X Title, etc.
 */
function stripSectionHeaderFromContent(content: string, sectionTitle: string): string {
  if (!content || !sectionTitle) return content;

  // Patterns to match section headers at the start of content
  const patterns = [
    // 第一章 绪论、第1章 绪论
    /^第[一二三四五六七八九十百千万\d]+[章节]\s*.+?\n/,
    // 1.1 研究背景、1.1.1 问题描述
    /^[\d.]+\s+.+?\n/,
    // Chapter 1 Introduction
    /^(Chapter|Section|Part)\s+[\d.]+\s*.+?\n/i,
  ];

  let result = content;
  for (const pattern of patterns) {
    const match = result.match(pattern);
    if (match) {
      // Verify matched header contains expected section title or title is very short
      if (match[0].includes(sectionTitle) || sectionTitle.length < 3) {
        result = result.slice(match[0].length);
        break;
      }
    }
  }

  return result.trim();
}

/**
 * Splits content into processable chunks based on document structure
 */
export function splitContentByStructure(content: string, structure: DocumentStructure): ContentChunk[] {
  const chunks: ContentChunk[] = [];

  // Extract special sections first
  const abstractContent = structure.abstractRange
    ? content.slice(structure.abstractRange.start, structure.abstractRange.end).trim()
    : undefined;

  const referencesContent = structure.referencesRange
    ? content.slice(structure.referencesRange.start, structure.referencesRange.end).trim()
    : undefined;

  const acknowledgementsContent = structure.acknowledgementsRange
    ? content.slice(structure.acknowledgementsRange.start, structure.acknowledgementsRange.end).trim()
    : undefined;

  // If we have no sections from structure extraction, treat as single chunk
  if (structure.sections.length === 0) {
    logger.warn('No sections found in structure, treating entire content as single chunk');
    return [
      {
        sections: [{ title: '', level: 1, content: content.slice(0, MAX_CHUNK_SIZE) }],
        chunkIndex: 0,
        totalChunks: 1,
        includesAbstract: !!abstractContent,
        includesReferences: !!referencesContent,
        includesAcknowledgements: !!acknowledgementsContent,
        abstractContent,
        referencesContent,
        acknowledgementsContent,
      },
    ];
  }

  // Extract content for each section
  const sectionsWithContent = structure.sections.map((sec, idx) => {
    const nextSection = structure.sections[idx + 1];
    const endPos = nextSection ? nextSection.startPos : content.length;

    // Avoid overlapping with special sections
    let sectionEnd = endPos;
    if (structure.referencesRange && sectionEnd > structure.referencesRange.start) {
      sectionEnd = structure.referencesRange.start;
    }
    if (structure.acknowledgementsRange && sectionEnd > structure.acknowledgementsRange.start) {
      sectionEnd = Math.min(sectionEnd, structure.acknowledgementsRange.start);
    }

    const rawContent = content.slice(sec.startPos, sectionEnd).trim();
    const cleanedContent = stripSectionHeaderFromContent(rawContent, sec.title);
    return {
      title: sec.title,
      level: sec.level,
      content: cleanedContent,
    };
  });

  // Group sections into chunks that fit within MAX_CHUNK_SIZE
  let currentChunk: ContentChunk = {
    sections: [],
    chunkIndex: 0,
    totalChunks: 0, // Will be set at the end
  };
  let currentChunkSize = 0;

  for (const section of sectionsWithContent) {
    const sectionSize = section.content.length;

    // If a single section exceeds max size, split it at paragraph boundaries
    if (sectionSize > MAX_CHUNK_SIZE) {
      // Flush current chunk if not empty
      if (currentChunk.sections.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          sections: [],
          chunkIndex: chunks.length,
          totalChunks: 0,
        };
        currentChunkSize = 0;
      }

      // Split large section into multiple chunks
      const subChunks = splitLargeSectionAtParagraphs(section);
      for (const subChunk of subChunks) {
        chunks.push({
          sections: [subChunk],
          chunkIndex: chunks.length,
          totalChunks: 0,
        });
      }
      continue;
    }

    // Check if adding this section would exceed the limit
    if (currentChunkSize + sectionSize > MAX_CHUNK_SIZE && currentChunk.sections.length > 0) {
      // Flush current chunk
      chunks.push(currentChunk);
      currentChunk = {
        sections: [],
        chunkIndex: chunks.length,
        totalChunks: 0,
      };
      currentChunkSize = 0;
    }

    // Add section to current chunk
    currentChunk.sections.push(section);
    currentChunkSize += sectionSize;
  }

  // Flush remaining sections
  if (currentChunk.sections.length > 0) {
    chunks.push(currentChunk);
  }

  // Handle special sections - add to first/last chunks or create separate chunks
  if (chunks.length > 0) {
    // Abstract goes with the first chunk
    if (abstractContent) {
      const abstractSize = abstractContent.length;
      const firstChunkSize = chunks[0].sections.reduce((sum, s) => sum + s.content.length, 0);

      if (firstChunkSize + abstractSize <= MAX_CHUNK_SIZE) {
        chunks[0].includesAbstract = true;
        chunks[0].abstractContent = abstractContent;
      } else {
        // Create separate chunk for abstract
        chunks.unshift({
          sections: [],
          chunkIndex: 0,
          totalChunks: 0,
          includesAbstract: true,
          abstractContent,
        });
      }
    }

    // References and acknowledgements go with the last chunk or separate
    const lastChunk = chunks[chunks.length - 1];
    const lastChunkSize = lastChunk.sections.reduce((sum, s) => sum + s.content.length, 0);

    if (acknowledgementsContent) {
      if (lastChunkSize + acknowledgementsContent.length <= MAX_CHUNK_SIZE) {
        lastChunk.includesAcknowledgements = true;
        lastChunk.acknowledgementsContent = acknowledgementsContent;
      } else {
        chunks.push({
          sections: [],
          chunkIndex: chunks.length,
          totalChunks: 0,
          includesAcknowledgements: true,
          acknowledgementsContent,
        });
      }
    }

    if (referencesContent) {
      const targetChunk = chunks[chunks.length - 1];
      const targetSize = targetChunk.sections.reduce((sum, s) => sum + s.content.length, 0);

      if (targetSize + referencesContent.length <= MAX_CHUNK_SIZE) {
        targetChunk.includesReferences = true;
        targetChunk.referencesContent = referencesContent;
      } else {
        chunks.push({
          sections: [],
          chunkIndex: chunks.length,
          totalChunks: 0,
          includesReferences: true,
          referencesContent,
        });
      }
    }
  }

  // Update chunk indices and total counts
  const totalChunks = chunks.length;
  chunks.forEach((chunk, idx) => {
    chunk.chunkIndex = idx;
    chunk.totalChunks = totalChunks;
  });

  logger.log(`Content split into ${totalChunks} chunks`);
  return chunks;
}

/**
 * Splits a large section at paragraph boundaries
 */
function splitLargeSectionAtParagraphs(
  section: { title: string; level: 1 | 2 | 3; content: string },
): Array<{ title: string; level: 1 | 2 | 3; content: string }> {
  const results: Array<{ title: string; level: 1 | 2 | 3; content: string }> = [];
  const content = section.content;

  // Split by double newlines (paragraph boundaries)
  const paragraphs = content.split(/\n\n+/);

  let currentContent = '';
  let partIndex = 1;

  for (const paragraph of paragraphs) {
    if (currentContent.length + paragraph.length > MAX_CHUNK_SIZE && currentContent.length > 0) {
      results.push({
        title: results.length === 0 ? section.title : `${section.title}（续${partIndex}）`,
        level: section.level,
        content: currentContent.trim(),
      });
      currentContent = paragraph;
      partIndex++;
    } else {
      currentContent += (currentContent ? '\n\n' : '') + paragraph;
    }
  }

  // Add remaining content
  if (currentContent.trim()) {
    results.push({
      title: results.length === 0 ? section.title : `${section.title}（续${partIndex}）`,
      level: section.level,
      content: currentContent.trim(),
    });
  }

  // If we couldn't split at paragraphs (single huge paragraph), force split
  if (results.length === 0 || results.some((r) => r.content.length > MAX_CHUNK_SIZE)) {
    return forceSplitContent(section);
  }

  return results;
}

/**
 * Force splits content at character boundaries as a last resort
 */
function forceSplitContent(
  section: { title: string; level: 1 | 2 | 3; content: string },
): Array<{ title: string; level: 1 | 2 | 3; content: string }> {
  const results: Array<{ title: string; level: 1 | 2 | 3; content: string }> = [];
  const content = section.content;

  let start = 0;
  let partIndex = 1;

  while (start < content.length) {
    let end = Math.min(start + MAX_CHUNK_SIZE, content.length);

    // Try to break at a sentence boundary
    if (end < content.length) {
      const lastSentenceEnd = content.slice(start, end).lastIndexOf('。');
      const lastPeriod = content.slice(start, end).lastIndexOf('. ');
      const breakPoint = Math.max(lastSentenceEnd, lastPeriod);

      if (breakPoint > MAX_CHUNK_SIZE * 0.5) {
        end = start + breakPoint + 1;
      }
    }

    results.push({
      title: results.length === 0 ? section.title : `${section.title}（续${partIndex}）`,
      level: section.level,
      content: content.slice(start, end).trim(),
    });

    start = end;
    partIndex++;
  }

  return results;
}

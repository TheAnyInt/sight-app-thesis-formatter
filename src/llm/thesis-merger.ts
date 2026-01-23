import { Logger } from '@nestjs/common';
import { ThesisData, Section, ThesisMetadata } from '../thesis/dto/thesis-data.dto';
import { ChunkProcessingResult } from './section-processor';

const logger = new Logger('ThesisMerger');

/**
 * Extended ThesisData with warnings for skipped content
 */
export interface ThesisDataWithWarnings extends ThesisData {
  warnings?: string[];
}

/**
 * Merge multiple partial ThesisData results into a complete document
 */
export function mergeThesisResults(results: ChunkProcessingResult[]): ThesisDataWithWarnings {
  const warnings: string[] = [];

  // Separate successful and failed results
  const successfulResults = results.filter((r) => r.success && r.data);
  const failedResults = results.filter((r) => !r.success);

  if (successfulResults.length === 0) {
    throw new Error('All chunks failed to process');
  }

  // Log warnings for failed chunks
  for (const failed of failedResults) {
    const warning = `Chunk ${failed.chunkIndex + 1} failed after ${failed.retryCount} retries: ${failed.error}`;
    logger.warn(warning);
    warnings.push(warning);
  }

  // Sort by chunk index to maintain order
  successfulResults.sort((a, b) => a.chunkIndex - b.chunkIndex);

  // Merge metadata (take from first chunk with metadata)
  const metadata = selectBestMetadata(successfulResults.map((r) => r.data!));

  // Merge sections in order
  const allSections: Section[] = [];
  for (const result of successfulResults) {
    if (result.data?.sections) {
      allSections.push(...result.data.sections);
    }
  }

  // Deduplicate sections (might have overlap at boundaries)
  const deduplicatedSections = deduplicateSections(allSections);

  // Merge special sections
  const abstract = successfulResults.find((r) => r.data?.abstract)?.data?.abstract;
  const abstract_en = successfulResults.find((r) => r.data?.abstract_en)?.data?.abstract_en;
  const keywords = successfulResults.find((r) => r.data?.keywords)?.data?.keywords;
  const keywords_en = successfulResults.find((r) => r.data?.keywords_en)?.data?.keywords_en;
  const acknowledgements = successfulResults.find((r) => r.data?.acknowledgements)?.data?.acknowledgements;

  // Merge references (may come from multiple chunks in rare cases)
  const references = mergeReferences(successfulResults.map((r) => r.data?.references).filter(Boolean) as string[]);

  const merged: ThesisDataWithWarnings = {
    metadata,
    sections: deduplicatedSections,
    abstract,
    abstract_en,
    keywords,
    keywords_en,
    references,
    acknowledgements,
  };

  if (warnings.length > 0) {
    merged.warnings = warnings;
  }

  logger.log(`Merged ${successfulResults.length} chunks into ${deduplicatedSections.length} sections`);
  if (failedResults.length > 0) {
    logger.warn(`${failedResults.length} chunks were skipped due to failures`);
  }

  return merged;
}

/**
 * Select the best metadata from multiple partial results
 */
function selectBestMetadata(partials: Partial<ThesisData>[]): ThesisMetadata {
  // Find the first chunk with metadata, or combine from multiple
  const allMetadata = partials.map((p) => p.metadata).filter(Boolean);

  if (allMetadata.length === 0) {
    return {
      title: '',
      author_name: '',
    };
  }

  // Score each metadata by completeness
  const scored = allMetadata.map((m) => ({
    metadata: m!,
    score: countNonEmptyFields(m!),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Start with the most complete metadata
  const best = { ...scored[0].metadata };

  // Fill in missing fields from other sources
  for (const { metadata } of scored.slice(1)) {
    if (!best.title && metadata.title) best.title = metadata.title;
    if (!best.title_en && metadata.title_en) best.title_en = metadata.title_en;
    if (!best.author_name && metadata.author_name) best.author_name = metadata.author_name;
    if (!best.student_id && metadata.student_id) best.student_id = metadata.student_id;
    if (!best.school && metadata.school) best.school = metadata.school;
    if (!best.major && metadata.major) best.major = metadata.major;
    if (!best.supervisor && metadata.supervisor) best.supervisor = metadata.supervisor;
    if (!best.date && metadata.date) best.date = metadata.date;
  }

  return best;
}

/**
 * Count non-empty fields in metadata
 */
function countNonEmptyFields(metadata: ThesisMetadata): number {
  let count = 0;
  if (metadata.title) count++;
  if (metadata.title_en) count++;
  if (metadata.author_name) count++;
  if (metadata.student_id) count++;
  if (metadata.school) count++;
  if (metadata.major) count++;
  if (metadata.supervisor) count++;
  if (metadata.date) count++;
  return count;
}

/**
 * Deduplicate sections that may have been duplicated at chunk boundaries
 * Also detects consecutive duplicate titles (same title + level back-to-back)
 */
function deduplicateSections(sections: Section[]): Section[] {
  if (sections.length <= 1) {
    return sections;
  }

  const result: Section[] = [];
  const seenHashes = new Set<string>();
  let lastTitle = '';
  let lastLevel = 0;

  for (const section of sections) {
    // Create a hash from title and first 100 chars of content
    const contentPreview = section.content.slice(0, 100);
    const hash = `${section.title}|${section.level}|${contentPreview}`;

    // Check for consecutive duplicate titles (same title + level back-to-back)
    const isConsecutiveDuplicate =
      section.title === lastTitle &&
      section.level === lastLevel;

    if (!seenHashes.has(hash) && !isConsecutiveDuplicate) {
      seenHashes.add(hash);
      result.push(section);
      lastTitle = section.title;
      lastLevel = section.level;
    } else {
      logger.debug(`Duplicate section removed: "${section.title}" (consecutive: ${isConsecutiveDuplicate})`);
    }
  }

  return result;
}

/**
 * Merge reference lists from multiple chunks
 */
function mergeReferences(referenceLists: string[]): string | undefined {
  if (referenceLists.length === 0) {
    return undefined;
  }

  if (referenceLists.length === 1) {
    return referenceLists[0];
  }

  // Split each reference list into individual references
  const allRefs: string[] = [];
  for (const refList of referenceLists) {
    // Split by common reference separators
    const refs = refList.split(/\n(?=\[\d+\]|\d+\.\s|\d+\)\s)/);
    for (const ref of refs) {
      const trimmed = ref.trim();
      if (trimmed) {
        allRefs.push(trimmed);
      }
    }
  }

  // Deduplicate references by their content (ignoring numbering differences)
  const uniqueRefs: string[] = [];
  const seenContent = new Set<string>();

  for (const ref of allRefs) {
    // Normalize reference for comparison (remove leading numbers/brackets)
    const normalized = ref.replace(/^[\[\d\.\)\]]+\s*/, '').toLowerCase().slice(0, 100);

    if (!seenContent.has(normalized)) {
      seenContent.add(normalized);
      uniqueRefs.push(ref);
    }
  }

  return uniqueRefs.join('\n');
}

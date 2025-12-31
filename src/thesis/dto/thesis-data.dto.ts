export interface Chapter {
  title: string;
  content: string;
}

export interface ThesisData {
  // Metadata fields
  title: string;
  school: string;
  major: string;
  author_name: string;
  student_id: string;
  supervisor: string;
  date: string;
  author_signature: string;
  signature_date: string;

  // Dynamic chapters extracted from document
  chapters: Chapter[];

  // Fixed sections (mapped from chapters or extracted directly)
  introduction: string;
  conclusion: string;
  references: string;
  acknowledgements: string;

  // Body content fields (filled from chapters)
  technical_comparison: string;
  industry_comparison: string;
  key_variables: string;
  development_trends: string;
}

// String-only keys (excluding 'chapters' which is an array)
export type StringKeys = Exclude<keyof ThesisData, 'chapters'>;

export const METADATA_KEYS: StringKeys[] = [
  'title',
  'school',
  'major',
  'author_name',
  'student_id',
  'supervisor',
  'date',
  'author_signature',
  'signature_date',
];

export const BODY_CONTENT_KEYS: StringKeys[] = [
  'technical_comparison',
  'industry_comparison',
  'key_variables',
  'development_trends',
];

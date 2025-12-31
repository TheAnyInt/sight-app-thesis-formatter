export type ReferenceType =
  | 'journal'
  | 'book'
  | 'conference'
  | 'thesis'
  | 'website'
  | 'standard'
  | 'other';

export interface Reference {
  type: ReferenceType;
  authors: string[];
  title: string;
  journal?: string;
  publisher?: string;
  publisherLocation?: string;
  year: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  conferenceName?: string;
  institution?: string;
  standardNumber?: string;
}

export const REFERENCE_TYPE_MARKERS: Record<ReferenceType, string> = {
  journal: 'J',
  book: 'M',
  conference: 'C',
  thesis: 'D',
  website: 'EB/OL',
  standard: 'S',
  other: 'Z',
};

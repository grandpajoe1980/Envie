export type Language = 'vn' | 'en';

export interface WordTranslation {
  word: string;
  translation: string;
}

export interface Sentence {
  id: string;
  vn: string;
  en: string;
  pronunciation: string; // Phonetic or tone guide for Vietnamese
  en_pronunciation?: string; // Phonetic guide for English
  literal_translation?: WordTranslation[]; // Word by word literal translation
  difficulty: number; // 1-5
  category: 'vocabulary' | 'grammar' | 'common' | 'markers';
}

export interface SRSState {
  sentenceId: string;
  nextReview: number; // Timestamp
  interval: number; // Days
  ease: number; // Initial ease factor
  history: ReviewHistory[];
}

export interface ReviewHistory {
  date: number;
  score: number; // 0-100 from pronunciation or 1-5 from self-assessment
}

export interface UserStats {
  direction: 'en-to-vn' | 'vn-to-en';
  difficulty: number;
}

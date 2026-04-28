export interface Option {
  text?: string;
  image?: string;
  analysisImage?: string;
}

export interface Question {
  id: string;
  type: 'single' | 'tf';
  text?: string;
  image?: string;
  imageFallbackText?: string;
  images?: string[];
  options?: (string | Option)[];
  optionImages?: string[];
  answer: number;
  score: number;
  analysis?: string;
  analysisImage?: string;
}

export interface QuizVersion {
  id: string;
  name: string;
  questions: Question[];
}

export const quizVersions: QuizVersion[] = [];

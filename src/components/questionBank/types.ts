import type { Question } from '../../data';

export type ImageTarget = 'images' | 'optionImages';

export interface LibraryImage {
  id: string;
  name: string;
  content: string;
}

export interface ImageDragPayload {
  image: string;
  from: 'library' | ImageTarget;
  questionId?: string;
  index?: number;
}

export interface DropZoneProps {
  id: string;
  label: string;
  question: Question;
  target: ImageTarget;
  localImages: Record<string, string>;
  cloudImages: Record<string, string>;
  hoverZone: string;
  onDragStart: (event: React.DragEvent<HTMLElement>, payload: ImageDragPayload) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>, id: string) => void;
  onDrop: (event: React.DragEvent<HTMLElement>, questionId: string, target: ImageTarget) => void;
  onRemove: (questionId: string, target: ImageTarget, index: number) => void;
}

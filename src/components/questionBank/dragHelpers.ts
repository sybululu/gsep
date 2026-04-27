import type { Question } from '../../data';
import { normalizeQuizQuestions } from '../../utils/quizValidation';
import { DRAG_IMAGE_MIME } from './imageUtils';
import type { ImageDragPayload, ImageTarget } from './types';

export function startQuestionImageDrag(event: React.DragEvent<HTMLElement>, payload: ImageDragPayload) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(DRAG_IMAGE_MIME, JSON.stringify(payload));
  event.dataTransfer.setData('text/plain', payload.image);
}

export function readQuestionImageDrag(event: React.DragEvent<HTMLElement>) {
  const raw = event.dataTransfer.getData(DRAG_IMAGE_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImageDragPayload;
  } catch {
    return null;
  }
}

export function handleQuestionImageDragOver(event: React.DragEvent<HTMLElement>, setHoverZone: (id: string) => void, id: string) {
  if (!event.dataTransfer.types.includes(DRAG_IMAGE_MIME)) return;
  event.preventDefault();
  event.stopPropagation();
  setHoverZone(id);
}

export function moveQuestionImage(
  questions: Question[],
  payload: ImageDragPayload,
  questionId: string,
  target: ImageTarget,
) {
  const withoutOld = questions.map(question => {
    if (!payload.questionId || payload.index === undefined || question.id !== payload.questionId) return question;
    if (payload.from === 'images') return { ...question, images: question.images.filter((_, index) => index !== payload.index) };
    if (payload.from === 'optionImages') return { ...question, optionImages: question.optionImages.filter((_, index) => index !== payload.index) };
    return question;
  });

  return normalizeQuizQuestions(withoutOld.map(question => {
    if (question.id !== questionId) return question;
    return { ...question, [target]: [...question[target], payload.image] };
  }));
}

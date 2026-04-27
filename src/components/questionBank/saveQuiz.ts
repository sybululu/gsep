import { doc, setDoc } from 'firebase/firestore';
import type { Question } from '../../data';
import { db } from '../../firebase';
import { buildQuizVersion, validateQuizVersion } from '../../utils/quizValidation';
import { dataUrlBytes, MAX_FIRESTORE_IMAGE_BYTES, MAX_FIRESTORE_IMAGE_LABEL } from './imageUtils';
import type { LibraryImage } from './types';

export async function saveQuestionBankToFirestore(
  selectedId: string,
  name: string,
  questions: Question[],
  libraryImages: LibraryImage[],
) {
  const quiz = buildQuizVersion(selectedId, name, questions);
  validateQuizVersion(quiz);

  for (const image of libraryImages) {
    if (dataUrlBytes(image.content) > MAX_FIRESTORE_IMAGE_BYTES) {
      throw new Error(`图片 ${image.name} 超过 ${MAX_FIRESTORE_IMAGE_LABEL}`);
    }
  }

  await Promise.all(libraryImages.map(image => setDoc(doc(db, 'images', selectedId, 'images', image.name), {
    content: image.content,
  })));

  await setDoc(doc(db, 'quizVersions', selectedId), quiz);
  return quiz;
}

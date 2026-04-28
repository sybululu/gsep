import type { Question } from '../../data';
import { supabase, QUIZ_VERSIONS_TABLE, IMAGES_TABLE } from '../../supabase';
import { buildQuizVersion, validateQuizVersion } from '../../utils/quizValidation';
import { dataUrlBytes, MAX_FIRESTORE_IMAGE_BYTES, MAX_FIRESTORE_IMAGE_LABEL } from './imageUtils';
import type { LibraryImage } from './types';

export async function saveQuestionBankToSupabase(
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

  // 批量上传图片
  const imageRecords = libraryImages.map(image => ({
    version_id: selectedId,
    image_id: image.name,
    content: image.content,
  }));

  if (imageRecords.length > 0) {
    const { error: imageError } = await supabase
      .from(IMAGES_TABLE)
      .upsert(imageRecords);
    if (imageError) throw imageError;
  }

  // 保存题库
  const { error: quizError } = await supabase
    .from(QUIZ_VERSIONS_TABLE)
    .upsert(quiz);
  if (quizError) throw quizError;

  return quiz;
}

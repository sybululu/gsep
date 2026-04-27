import { makeImageDocName, MAX_FIRESTORE_IMAGE_BYTES, MAX_FIRESTORE_IMAGE_LABEL } from './imageUtils';
import type { LibraryImage } from './types';

export const isFileDrag = (event: React.DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer.types).includes('Files');

export async function imageFilesToLibraryItems(files: File[]) {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  const oversized = imageFiles.filter(file => file.size > MAX_FIRESTORE_IMAGE_BYTES);

  if (oversized.length > 0) {
    alert(`以下图片过大，请压缩到 ${MAX_FIRESTORE_IMAGE_LABEL} 以内：\n${oversized.map(file => file.name).join('\n')}`);
  }

  const accepted = imageFiles.filter(file => file.size <= MAX_FIRESTORE_IMAGE_BYTES);

  return Promise.all(accepted.map(file => new Promise<LibraryImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve({
      id: `local-${Date.now()}-${file.name}`,
      name: makeImageDocName(file),
      content: String(event.target?.result || ''),
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  })));
}

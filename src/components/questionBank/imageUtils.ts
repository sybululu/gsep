export const MAX_FIRESTORE_IMAGE_BYTES = 560_000;
export const MAX_FIRESTORE_IMAGE_LABEL = '550KB';
export const DRAG_IMAGE_MIME = 'text/gesp-image';
export const PUBLIC_IMAGE_RE = /^[\w-]+\.(png|jpe?g|gif|webp|svg)$/i;

export const makeImageDocName = (file: File) => {
  const safeBase = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';

  return `${safeBase}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const dataUrlBytes = (value: string) => Math.ceil(value.length * 0.75);

export const isCloudImageId = (value: string) =>
  Boolean(value) && !value.startsWith('data:') && !value.startsWith('/') && !PUBLIC_IMAGE_RE.test(value);

export const resolveImageSrc = (
  image: string,
  localImages: Record<string, string>,
  cloudImages: Record<string, string>,
) => {
  if (!image) return '';
  if (image.startsWith('data:') || image.startsWith('/')) return image;
  if (localImages[image]) return localImages[image];
  if (PUBLIC_IMAGE_RE.test(image)) return `/${image}`;
  return cloudImages[image] || '';
};

export const imageDisplayName = (image: string) => image.startsWith('data:') ? '本地图片' : image;

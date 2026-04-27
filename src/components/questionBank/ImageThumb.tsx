import { imageDisplayName, isCloudImageId, resolveImageSrc } from './imageUtils';

interface ImageThumbProps {
  image: string;
  localImages: Record<string, string>;
  cloudImages: Record<string, string>;
}

export function ImageThumb({ image, localImages, cloudImages }: ImageThumbProps) {
  const src = resolveImageSrc(image, localImages, cloudImages);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] text-slate-400">
        {isCloudImageId(image) ? '云端图片加载中' : '图片不可用'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={imageDisplayName(image)}
      draggable={false}
      className="h-full w-full bg-white object-contain"
    />
  );
}

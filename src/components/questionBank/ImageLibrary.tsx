import { Plus, X } from 'lucide-react';
import { ImageThumb } from './ImageThumb';
import { MAX_FIRESTORE_IMAGE_LABEL } from './imageUtils';
import type { ImageDragPayload, LibraryImage } from './types';

interface ImageLibraryProps {
  images: LibraryImage[];
  localImages: Record<string, string>;
  cloudImages: Record<string, string>;
  isUploadHover: boolean;
  onUploadOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onUploadLeave: () => void;
  onUploadDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onImageDragStart: (event: React.DragEvent<HTMLElement>, payload: ImageDragPayload) => void;
  onRemove: (index: number) => void;
}

export function ImageLibrary({
  images,
  localImages,
  cloudImages,
  isUploadHover,
  onUploadOver,
  onUploadLeave,
  onUploadDrop,
  onImageDragStart,
  onRemove,
}: ImageLibraryProps) {
  return (
    <aside className="flex w-[360px] flex-col border-r bg-white">
      <div className="border-b p-4">
        <b>图片库</b>
        <p className="text-xs text-slate-500">拖图片到下方上传，再拖到右侧配图区。</p>
      </div>
      <div
        onDragOver={onUploadOver}
        onDragLeave={onUploadLeave}
        onDrop={onUploadDrop}
        className={`m-4 rounded-2xl border-2 border-dashed p-6 text-center ${
          isUploadHover ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <Plus className="mx-auto" />
        <b>拖拽图片到这里</b>
        <p className="text-xs text-slate-400">≤ {MAX_FIRESTORE_IMAGE_LABEL}</p>
      </div>
      <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-2">
        {images.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-sm text-slate-400">暂无上传图片</div>
        ) : images.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={(event) => onImageDragStart(event, { from: 'library', image: image.name, index })}
            className="group relative cursor-grab overflow-hidden rounded-xl border bg-white"
          >
            <div className="h-24">
              <ImageThumb image={image.name} localImages={localImages} cloudImages={cloudImages} />
            </div>
            <div className="truncate bg-slate-50 p-1 text-[10px]">{image.name}</div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

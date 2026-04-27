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
  onLibraryImageDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onLibraryDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
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
  onLibraryImageDrop,
  onLibraryDragOver,
}: ImageLibraryProps) {
  // 处理图片从题目区域拖回图片库的 hover
  const handleLibraryDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    // 如果是文件拖拽（上传），交给 onUploadOver 处理
    const hasFiles = Array.from(event.dataTransfer.types).includes('Files');
    if (hasFiles) {
      onUploadOver(event);
      return;
    }
    // 如果是图片拖拽，交给 onLibraryDragOver 处理
    if (onLibraryDragOver) {
      onLibraryDragOver(event);
    }
  };

  // 处理图片从题目区域拖回图片库的 drop
  const handleLibraryDrop = (event: React.DragEvent<HTMLDivElement>) => {
    // 如果是文件拖拽（上传），交给 onUploadDrop 处理
    const hasFiles = Array.from(event.dataTransfer.types).includes('Files');
    if (hasFiles) {
      onUploadDrop(event);
      return;
    }
    // 如果是图片拖拽，交给 onLibraryImageDrop 处理
    if (onLibraryImageDrop) {
      onLibraryImageDrop(event);
    }
  };

  return (
    <aside className="flex w-[360px] flex-col border-r bg-white">
      <div className="border-b p-4">
        <b>图片库</b>
        <p className="text-xs text-slate-500">拖图片到下方上传，再拖到右侧配图区。</p>
      </div>
      {/* 整个左侧区域都支持拖拽上传和图片拖回 */}
      <div
        onDragOver={handleLibraryDragOver}
        onDragLeave={onUploadLeave}
        onDrop={handleLibraryDrop}
        className="flex flex-1 flex-col"
      >
        {/* 上传提示区域 */}
        <div
          className={`m-4 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
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
      </div>
    </aside>
  );
}

import { Plus, X, Upload } from 'lucide-react';
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
  return (
    <aside className="flex w-[360px] flex-col border-r bg-white">
      <div className="border-b p-4">
        <b>图片库</b>
        <p className="text-xs text-slate-500">拖图片到下方上传，再拖到右侧配图区。</p>
      </div>
      {/* 整个左侧区域都支持拖拽上传 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onUploadOver(e);
          if (onLibraryDragOver) onLibraryDragOver(e);
        }}
        onDragLeave={(e) => {
          // 只有真正离开整个区域时才触发
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
          ) {
            onUploadLeave();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          onUploadDrop(e);
          if (onLibraryImageDrop) onLibraryImageDrop(e);
        }}
        className={`relative flex flex-1 flex-col transition-all ${
          isUploadHover ? 'bg-blue-50/50' : ''
        }`}
      >
        {/* 文件拖拽时的覆盖层 */}
        {isUploadHover && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90">
            <Upload className="h-12 w-12 text-blue-500" />
            <b className="mt-2 text-lg text-blue-600">释放以上传图片</b>
            <p className="text-xs text-blue-400">≤ {MAX_FIRESTORE_IMAGE_LABEL}</p>
          </div>
        )}

        {/* 图片网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {images.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-slate-400">
              <Upload className="mb-2 h-8 w-8 opacity-50" />
              暂无上传图片<br />
              <span className="text-xs">拖拽图片到此处上传</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={(event) => onImageDragStart(event, { from: 'library', image: image.name, index })}
                  className="group relative cursor-grab overflow-hidden rounded-xl border bg-white active:cursor-grabbing"
                >
                  <div className="h-24">
                    <ImageThumb image={image.name} localImages={localImages} cloudImages={cloudImages} />
                  </div>
                  <div className="truncate bg-slate-50 p-1 text-[10px]">{image.name}</div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="absolute right-1 top-1 hidden rounded-full bg-red-500 p-1 text-white group-hover:block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

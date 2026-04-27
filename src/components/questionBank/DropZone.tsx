import { X } from 'lucide-react';
import { ImageThumb } from './ImageThumb';
import { imageDisplayName } from './imageUtils';
import type { DropZoneProps } from './types';

export function DropZone({
  id,
  label,
  question,
  target,
  localImages,
  cloudImages,
  hoverZone,
  onDragStart,
  onDragOver,
  onDrop,
  onRemove,
}: DropZoneProps) {
  const images = question[target] || [];

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
      <div
        onDragOver={(event) => onDragOver(event, id)}
        onDragEnter={(event) => onDragOver(event, id)}
        onDrop={(event) => onDrop(event, question.id, target)}
        className={`min-h-28 rounded-xl border-2 border-dashed p-3 ${
          hoverZone === id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {images.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-slate-400">
            把左侧图片拖到这里
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                draggable
                onDragStart={(event) => onDragStart(event, {
                  from: target,
                  questionId: question.id,
                  index,
                  image,
                })}
                className="group relative w-28 shrink-0 cursor-grab overflow-hidden rounded-xl border bg-white"
              >
                <div className="h-20">
                  <ImageThumb image={image} localImages={localImages} cloudImages={cloudImages} />
                </div>
                <div className="truncate bg-slate-50 p-1 text-[10px]">
                  {target === 'optionImages' ? `${String.fromCharCode(65 + index)} · ` : ''}
                  {imageDisplayName(image)}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(question.id, target, index)}
                  className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

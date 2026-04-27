import { Trash2, X } from 'lucide-react';
import type { Question } from '../../data';
import { DropZone } from './DropZone';
import type { ImageDragPayload, ImageTarget } from './types';

interface QuestionCardProps {
  question: Question;
  index: number;
  localImages: Record<string, string>;
  cloudImages: Record<string, string>;
  hoverZone: string;
  onUpdate: (index: number, patch: Partial<Question>) => void;
  onUpdateOption: (qIndex: number, optionIndex: number, value: string) => void;
  onAddOption: (qIndex: number) => void;
  onRemoveOption: (qIndex: number, optionIndex: number) => void;
  onDelete: (index: number) => void;
  onImageDragStart: (event: React.DragEvent<HTMLElement>, payload: ImageDragPayload) => void;
  onImageDragOver: (event: React.DragEvent<HTMLElement>, id: string) => void;
  onImageDrop: (event: React.DragEvent<HTMLElement>, questionId: string, target: ImageTarget) => void;
  onRemoveImage: (questionId: string, target: ImageTarget, index: number) => void;
}

export function QuestionCard({
  question,
  index,
  localImages,
  cloudImages,
  hoverZone,
  onUpdate,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onDelete,
  onImageDragStart,
  onImageDragOver,
  onImageDrop,
  onRemoveImage,
}: QuestionCardProps) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <b>第 {index + 1} 题</b>
          <select
            value={question.type}
            onChange={(event) => onUpdate(index, { type: event.target.value === 'tf' ? 'tf' : 'single' })}
            className="rounded border px-2 py-1"
          >
            <option value="single">选择题</option>
            <option value="tf">判断题</option>
          </select>
          <input
            type="number"
            value={question.score}
            onChange={(event) => onUpdate(index, { score: Number(event.target.value) })}
            className="w-20 rounded border px-2 py-1"
          />
        </div>
        <button type="button" onClick={() => onDelete(index)} className="text-red-500">
          <Trash2 />
        </button>
      </div>

      <textarea
        value={question.text}
        onChange={(event) => onUpdate(index, { text: event.target.value })}
        className="min-h-24 w-full rounded-xl border p-3"
      />

      <DropZone
        id={`${question.id}-images`}
        label="题干配图"
        question={question}
        target="images"
        localImages={localImages}
        cloudImages={cloudImages}
        hoverZone={hoverZone}
        onDragStart={onImageDragStart}
        onDragOver={onImageDragOver}
        onDrop={onImageDrop}
        onRemove={onRemoveImage}
      />

      <div className="mt-3 space-y-2">
        {question.options.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center gap-2">
            <b className="w-6 text-center">{String.fromCharCode(65 + optionIndex)}</b>
            <input
              type="radio"
              checked={question.answer === optionIndex}
              onChange={() => onUpdate(index, { answer: optionIndex })}
            />
            <input
              value={option}
              disabled={question.type === 'tf'}
              onChange={(event) => onUpdateOption(index, optionIndex, event.target.value)}
              className="flex-1 rounded border px-2 py-1 disabled:bg-slate-50"
            />
            {question.type !== 'tf' && question.options.length > 2 && (
              <button type="button" onClick={() => onRemoveOption(index, optionIndex)}>
                <X className="h-4 w-4 text-red-500" />
              </button>
            )}
          </div>
        ))}
        {question.type !== 'tf' && (
          <button type="button" onClick={() => onAddOption(index)} className="text-sm font-bold text-blue-600">
            + 添加选项
          </button>
        )}
      </div>

      {question.type !== 'tf' && (
        <DropZone
          id={`${question.id}-optionImages`}
          label="选项配图（按拖入顺序对应 A/B/C/D）"
          question={question}
          target="optionImages"
          localImages={localImages}
          cloudImages={cloudImages}
          hoverZone={hoverZone}
          onDragStart={onImageDragStart}
          onDragOver={onImageDragOver}
          onDrop={onImageDrop}
          onRemove={onRemoveImage}
        />
      )}
    </section>
  );
}

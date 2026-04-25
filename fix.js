const fs = require('fs');
let content = fs.readFileSync('src/components/ImageMatcher.tsx', 'utf8');

const target = `                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  onWheel={handleWheel}
                                  className={\`flex gap-3 overflow-x-auto custom-scrollbar pb-2 transition-colors min-h-[100px] border-2 border-dashed rounded-xl p-2 \${snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-300' : 'border-slate-200 bg-white'}\`}
                                >
                                   {board[\`\${q.id}-options\`]?.length === 0 && !snapshot.isDraggingOver && (
                                     <div className="flex-1 min-w-[120px] flex items-center justify-center text-slate-400 text-xs font-medium">
                                       拖拽图片到此
                                     </div>
                                   )}
                                   {board[\`\${q.id}-options\`]?.map((item, index) => (`

const replacement = `                                <div className={\`relative overflow-hidden transition-colors min-h-[100px] border-2 border-dashed rounded-xl p-2 \${snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-300' : 'border-slate-200 bg-white'}\`}>
                                  {board[\`\${q.id}-options\`]?.length === 0 && !snapshot.isDraggingOver && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium pointer-events-none">
                                      拖拽图片到此
                                    </div>
                                  )}
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    onWheel={handleWheel}
                                    className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 min-h-[80px]"
                                  >
                                   {board[\`\${q.id}-options\`]?.map((item, index) => (`

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ImageMatcher.tsx', content);

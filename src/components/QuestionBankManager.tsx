import { useEffect, useState, useRef, type DragEvent } from 'react';
import { ChevronDown, Download, FileJson, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Question, QuizVersion } from '../data';
import { parseTextToQuestions } from '../utils/parseQuestions';
import { normalizeQuizQuestions } from '../utils/quizValidation';
import { ensureQuestionBankAdmin } from './questionBank/adminAuth';
import { ImageLibrary } from './questionBank/ImageLibrary';
import { QuestionCard } from './questionBank/QuestionCard';
import { saveQuestionBankToFirestore } from './questionBank/saveQuiz';
import { handleQuestionImageDragOver, moveQuestionImage, readQuestionImageDrag, startQuestionImageDrag } from './questionBank/dragHelpers';
import { imageFilesToLibraryItems, isFileDrag } from './questionBank/uploadHelpers';
import { isCloudImageId } from './questionBank/imageUtils';
import type { ImageTarget, LibraryImage } from './questionBank/types';

const PAGE_SIZE = 10;

export function QuestionBankManager({ password, initialVersions, onClose }: { password?: string; initialVersions: QuizVersion[]; onClose: () => void }) {
  const [versions, setVersions] = useState<QuizVersion[]>(initialVersions);
  const [selectedId, setSelectedId] = useState(initialVersions[0]?.id || '');
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [cloudImages, setCloudImages] = useState<Record<string, string>>({});
  const [textOpen, setTextOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSingleScore, setImportSingleScore] = useState('2');
  const [importTfScore, setImportTfScore] = useState('4');
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; photo?: string } | null>(null);

  // 监听登录状态
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user ? { name: user.displayName || '用户', email: user.email || '', photo: user.photoURL || undefined } : null);
    });
    return () => unsubscribe();
  }, []);

  const handleCloudLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert('登录失败');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleDeleteVersion = async () => {
    if (!confirm(`确定删除题库 "${name}" 吗？此操作不可撤销！`)) return;
    if (!(await ensureQuestionBankAdmin(password))) return;
    try {
      await deleteDoc(doc(db, 'quizVersions', selectedId));
      await deleteDoc(doc(db, 'images', selectedId));
      setVersions(prev => prev.filter(v => v.id !== selectedId));
      setSelectedId(versions.find(v => v.id !== selectedId)?.id || '');
      alert('删除成功');
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };
  const [uploadHover, setUploadHover] = useState(false);
  const [hoverZone, setHoverZone] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  // 用于存储已从图库移除但仍在题目中使用的图片内容
  const usedImagesRef = useRef<Record<string, string>>({});

  const localImages = Object.fromEntries(libraryImages.map(image => [image.name, image.content]));

  // 收集所有使用的图片内容（包括云端和本地/已从图库移除的）
  const usedImages = {
    ...usedImagesRef.current,
    ...localImages,
    ...cloudImages
  };

  useEffect(() => {
    const selected = versions.find(version => version.id === selectedId);
    if (!selected) return;
    const nextQuestions = normalizeQuizQuestions(JSON.parse(JSON.stringify(selected.questions || [])));
    setName(selected.name);
    setQuestions(nextQuestions);
    setVisibleCount(Math.min(PAGE_SIZE, nextQuestions.length || PAGE_SIZE));
    setCloudImages({});
    
    // 加载对应题库的云端图片
    const loadLibraryImages = async () => {
      try {
        const imagesRef = collection(db, 'images', selectedId, 'images');
        const snap = await getDocs(imagesRef);
        const loaded: LibraryImage[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (typeof data.content === 'string') {
            loaded.push({ id: d.id, name: d.id, content: data.content });
          }
        });
        setLibraryImages(loaded);
      } catch (error) {
        console.warn('Failed to load library images', error);
      }
    };
    loadLibraryImages();
  }, [selectedId, versions]);

  useEffect(() => {
    const ids = new Set<string>();
    questions.forEach(question => [...question.images, ...question.optionImages].forEach(image => {
      if (isCloudImageId(image)) ids.add(image);
    }));

    // 只加载尚未加载的图片
    const newIds = Array.from(ids).filter(id => !cloudImages[id]);
    if (newIds.length === 0) return;

    newIds.forEach(async image => {
      try {
        const snap = await getDoc(doc(db, 'images', selectedId, 'images', image));
        const content = snap.exists() ? snap.data().content : '';
        if (typeof content === 'string') setCloudImages(prev => ({ ...prev, [image]: content }));
      } catch (error) {
        console.warn('Failed to load cloud image', image, error);
      }
    });
  }, [questions, selectedId]); // 移除 cloudImages 依赖，避免无限循环

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions(prev => normalizeQuizQuestions(prev.map((question, i) => i === index ? { ...question, ...patch } : question)));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => normalizeQuizQuestions(prev.map((question, i) => {
      if (i !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    })));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => normalizeQuizQuestions(prev.map((question, i) => i === questionIndex ? { ...question, options: [...question.options, '新选项'] } : question)));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => normalizeQuizQuestions(prev.map((question, i) => i === questionIndex ? {
      ...question,
      options: question.options.filter((_, index) => index !== optionIndex),
      optionImages: question.optionImages.filter((_, index) => index !== optionIndex),
    } : question)));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, normalizeQuizQuestions([{ id: `q-${Date.now()}`, type: 'single', text: '新题目', options: ['A', 'B', 'C', 'D'], answer: 0, score: 3, images: [], optionImages: [] }])[0]]);
    setVisibleCount(count => count + 1);
  };

  const deleteQuestion = (index: number) => {
    if (confirm('确定删除这道题吗？')) setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const onUploadOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setUploadHover(true);
  };

  const onUploadDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setUploadHover(false);
    const newItems = await imageFilesToLibraryItems(Array.from(event.dataTransfer.files));
    setLibraryImages(prev => [...prev, ...newItems]);
  };

  // 处理图片拖回图片库
  const onLibraryImageDrop = (event: DragEvent<HTMLDivElement>) => {
    const payload = readQuestionImageDrag(event);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    
    // 只有从 DropZone 拖来的图片才能拖回图片库
    if (payload.from === 'library') return;
    
    // 将图片添加到图片库
    const imageName = payload.image;
    // 检查图片是否已存在于库中
    if (!libraryImages.find(img => img.name === imageName)) {
      // 如果是云端图片，尝试从 cloudImages 获取
      const content = cloudImages[imageName];
      if (content) {
        setLibraryImages(prev => [...prev, {
          id: `local-${Date.now()}-${imageName}`,
          name: imageName,
          content: content,
        }]);
      }
    }
    
    // 从原题目位置移除图片
    if (payload.questionId && payload.index !== undefined) {
      setQuestions(prev => normalizeQuizQuestions(prev.map(question => {
        if (question.id !== payload.questionId) return question;
        return {
          ...question,
          [payload.from]: question[payload.from].filter((_, idx) => idx !== payload.index),
        };
      })));
    }
  };

  // 处理图片拖拽到图片库上方时的 hover 状态
  const onLibraryDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('text/gesp-image')) return;
    event.preventDefault();
    event.stopPropagation();
    setUploadHover(true);
  };

  const onImageDrop = (event: DragEvent<HTMLElement>, questionId: string, target: ImageTarget) => {
    const payload = readQuestionImageDrag(event);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    setHoverZone('');
    
    // 从 library 拖来的图片，使用后从图库移除，但保留内容用于显示
    if (payload.from === 'library') {
      const imageContent = libraryImages.find(img => img.name === payload.image)?.content;
      if (imageContent) {
        // 同时更新 usedImagesRef，保留图片内容
        usedImagesRef.current = { ...usedImagesRef.current, [payload.image]: imageContent };
      }
      setLibraryImages(prev => prev.filter(img => img.name !== payload.image));
    }
    
    setQuestions(prev => moveQuestionImage(prev, payload, questionId, target));
  };

  const removeAssignedImage = (questionId: string, target: ImageTarget, index: number) => {
    setQuestions(prev => normalizeQuizQuestions(prev.map(question => question.id === questionId ? {
      ...question,
      [target]: question[target].filter((_, imageIndex) => imageIndex !== index),
    } : question)));
  };

  const createVersion = async () => {
    const versionName = prompt('请输入新题库名称：');
    if (!versionName || !(await ensureQuestionBankAdmin(password))) return;
    const version = { id: `version-${Date.now()}`, name: versionName, questions: [] };
    await setDoc(doc(db, 'quizVersions', version.id), version);
    setVersions(prev => [...prev, version]);
    setSelectedId(version.id);
  };

  const importTextQuestions = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const parsed = normalizeQuizQuestions(parseTextToQuestions(importText));
      if (!parsed.length) return alert('未识别到选择题或判断题。');
      
      // 用用户设置的分值覆盖解析出来的分值
      const singleScore = parseInt(importSingleScore) || 2;
      const tfScore = parseInt(importTfScore) || 4;
      parsed.forEach(q => {
        q.score = q.type === 'tf' ? tfScore : singleScore;
      });
      
      const overwrite = confirm(`识别到 ${parsed.length} 道选择/判断题（单选每题${singleScore}分，判断每题${tfScore}分）。确定替换当前题库，取消追加。`);
      setQuestions(prev => overwrite ? parsed : [...prev, ...parsed]);
      setVisibleCount(Math.min(PAGE_SIZE, overwrite ? parsed.length : questions.length + parsed.length));
      setTextOpen(false);
      setImportText('');
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (!(await ensureQuestionBankAdmin(password))) return;
    try {
      // 合并 libraryImages 和 usedImagesRef 中的所有图片
      const allImages: LibraryImage[] = [...libraryImages];
      Object.entries(usedImagesRef.current).forEach(([name, content]) => {
        if (!allImages.find(img => img.name === name)) {
          allImages.push({ id: name, name, content });
        }
      });
      
      const quiz = await saveQuestionBankToFirestore(selectedId, name, questions, allImages);
      setVersions(prev => prev.map(version => version.id === selectedId ? quiz : version));
      alert(`同步成功：${quiz.questions.length} 道题，${allImages.length} 张图片。`);
      onClose();
    } catch (error: any) {
      alert('保存失败：' + (error?.message || String(error)));
    }
  };

  const visibleQuestions = questions.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F1F5F9] notranslate" translate="no">
      <header className="flex shrink-0 items-center justify-between gap-4 overflow-x-auto border-b bg-white p-4">
        <div className="flex items-center gap-3">
          {googleUser ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              {googleUser.photo && <img src={googleUser.photo} alt="" className="w-6 h-6 rounded-full" />}
              <span className="text-sm text-green-700 font-medium">{googleUser.name}</span>
              <button onClick={handleLogout} className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">退出</button>
            </div>
          ) : (
            <button onClick={handleCloudLogin} className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white">登录云数据库</button>
          )}
          <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="rounded border px-2 py-2">
            {versions.map(version => <option key={version.id} value={version.id}>{version.name}</option>)}
          </select>
          <ChevronDown className="h-4 w-4" />
          <button onClick={createVersion} className="rounded border px-2 py-2 font-bold">新建题库</button>
          {versions.length > 1 && (
            <button onClick={handleDeleteVersion} className="rounded bg-red-600 px-3 py-2 font-bold text-white flex items-center gap-1">
              <Trash2 className="h-4 w-4" /> 删除题库
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTextOpen(true)} className="rounded-xl bg-purple-600 px-3 py-2 font-bold text-white"><FileJson className="inline h-4 w-4" /> 文本导入</button>
          <button onClick={save} className="rounded-xl bg-blue-600 px-3 py-2 font-bold text-white"><Download className="inline h-4 w-4" /> 同步题库</button>
          <button onClick={onClose} className="rounded bg-slate-100 p-2"><X /></button>
        </div>
      </header>

      {textOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-5">
            <h2 className="text-xl font-bold">导入选择/判断题</h2>
            <textarea value={importText} onChange={event => setImportText(event.target.value)} className="mt-3 h-[40vh] w-full rounded-xl border p-3" />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">单选题每题</label>
                <input
                  type="number"
                  value={importSingleScore}
                  onChange={e => setImportSingleScore(e.target.value)}
                  className="w-16 rounded border px-2 py-1 text-center"
                  min="1"
                  max="100"
                />
                <label className="text-sm">分</label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">判断题每题</label>
                <input
                  type="number"
                  value={importTfScore}
                  onChange={e => setImportTfScore(e.target.value)}
                  className="w-16 rounded border px-2 py-1 text-center"
                  min="1"
                  max="100"
                />
                <label className="text-sm">分</label>
              </div>
              <div className="flex-1"></div>
              <button onClick={() => { setTextOpen(false); setImportText(''); }}>取消</button>
              <button onClick={importTextQuestions} disabled={!importText.trim() || importing} className="rounded-xl bg-purple-600 px-4 py-2 text-white">
                {importing ? <Loader2 className="animate-spin" /> : '解析'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <ImageLibrary
          images={libraryImages}
          localImages={localImages}
          cloudImages={cloudImages}
          isUploadHover={uploadHover}
          onUploadOver={onUploadOver}
          onUploadLeave={() => setUploadHover(false)}
          onUploadDrop={onUploadDrop}
          onImageDragStart={startQuestionImageDrag}
          onRemove={index => setLibraryImages(prev => prev.filter((_, i) => i !== index))}
          onLibraryImageDrop={onLibraryImageDrop}
          onLibraryDragOver={onLibraryDragOver}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex justify-between rounded-2xl border bg-white p-4">
            <input value={name} onChange={event => setName(event.target.value)} className="border-b text-xl font-bold outline-none" />
            <span>{questions.length} 题</span>
          </div>
          <div className="space-y-4">
            {visibleQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                localImages={usedImages}
                cloudImages={cloudImages}
                hoverZone={hoverZone}
                onUpdate={updateQuestion}
                onUpdateOption={updateOption}
                onAddOption={addOption}
                onRemoveOption={removeOption}
                onDelete={deleteQuestion}
                onImageDragStart={startQuestionImageDrag}
                onImageDragOver={(event, id) => handleQuestionImageDragOver(event, setHoverZone, id)}
                onImageDrop={onImageDrop}
                onRemoveImage={removeAssignedImage}
              />
            ))}
          </div>
          <div className="flex justify-center gap-3 py-8">
            <button onClick={addQuestion} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"><Plus className="inline h-4 w-4" /> 新增题目</button>
            {visibleCount < questions.length && <button onClick={() => setVisibleCount(count => Math.min(count + PAGE_SIZE, questions.length))} className="rounded-xl border bg-white px-5 py-3">加载更多</button>}
          </div>
        </main>
      </div>
    </div>
  );
}

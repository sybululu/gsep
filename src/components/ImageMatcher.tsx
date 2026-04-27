import React, { useState, useEffect, DragEvent } from 'react';
import { QuizVersion, Question, QuestionType } from '../data';
import { Image as ImageIcon, Download, Upload, FileJson, X, Plus, ChevronDown, Trash2, Edit3, Settings, Wand2, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface Item {
  id: string; // The image url or local base64
  name: string; // firestore image document id
  displayName?: string; // ui display name
  url: string; // src
}

interface Board {
  [key: string]: Item[];
}

export const ImageMatcher = ({ password, initialVersions, onClose }: { password?: string, initialVersions: QuizVersion[], onClose: () => void }) => {
  const [versions, setVersions] = useState<QuizVersion[]>(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersions[0]?.id || '');
  
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const [versionName, setVersionName] = useState('');

  const [board, setBoard] = useState<Board>({ unassigned: [] });
  const [loading, setLoading] = useState(true);
  const [dragOverlay, setDragOverlay] = useState(false);
  const [textImportModalOpen, setTextImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(auth.currentUser?.email || null);

  const toValidFirestoreId = (raw: string, fallbackPrefix = 'img') => {
    const cleaned = raw
      .trim()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100);
    return cleaned || `${fallbackPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const getFriendlyFirebaseMessage = (err: any) => {
    const code = err?.code || '';
    if (code === 'permission-denied') return '权限不足：请检查 Firestore 规则/登录状态。';
    if (code === 'auth/unauthorized-domain') return '当前域名未加入 Firebase Auth 授权域名，请在 Firebase 控制台添加 Cloudflare 域名。';
    if (code === 'invalid-argument') return '请求参数无效：请检查题库字段格式或图片 ID。';
    return err?.message || String(err);
  };

  const reportFirestoreError = (err: unknown, operationType: OperationType, path: string) => {
    try {
      handleFirestoreError(err, operationType, path);
    } catch {
      // keep UI alive after logging
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserEmail(user?.email || null);
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      alert(`登录失败：${getFriendlyFirebaseMessage(err)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      alert(`退出失败：${getFriendlyFirebaseMessage(err)}`);
    }
  };

  const toValidFirestoreId = (raw: string, fallbackPrefix = 'img') => {
    const cleaned = raw
      .trim()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100);
    return cleaned || `${fallbackPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  useEffect(() => {
    if (!selectedVersionId) return;
    const currentVersion = versions.find(v => v.id === selectedVersionId);
    if (!currentVersion) return;

    setVersionName(currentVersion.name);
    setLocalQuestions(JSON.parse(JSON.stringify(currentVersion.questions)));
    
    const allKnownImages = new Set<string>();
    const initialBoard: Board = { unassigned: board.unassigned || [] }; 
    
    currentVersion.questions.forEach(q => {
      const imgs = (q.images || []).filter(Boolean);
      const optImgs = (q.optionImages || []).filter(Boolean);
      initialBoard[`${q.id}-body`] = imgs.map((img, i) => ({
        id: `${q.id}-body-img-${i}-${img}`,
        name: img,
        displayName: img,
        url: img.startsWith('blob:') || img.startsWith('data:') ? img : `/${img}`
      }));
      initialBoard[`${q.id}-options`] = optImgs.map((img, i) => ({
        id: `${q.id}-opt-img-${i}-${img}`,
        name: img,
        displayName: img,
        url: img.startsWith('blob:') || img.startsWith('data:') ? img : `/${img}`
      }));
      imgs.forEach(i => allKnownImages.add(i));
      optImgs.forEach(i => allKnownImages.add(i));
    });

    const publicImgs = [
      "0401f5f5-ae0d-4bd5-a594-20986816f754.png", "0f4c5edd-24ad-46db-ac17-42c961f7fc80.png",
      "205e8eba-ba07-4a40-abcb-7ef83f6abef8.png", "2af09c66-4fa5-4a3e-9a87-fa5a915140a1.png",
      "2b3af826-8c47-4f63-b65c-f000ce7547d8.png", "40c9803c-35eb-4282-a388-00a83bf6ac88.png",
      "440069c0-0d86-4d0f-b486-a6449ef99928.png", "4dc2d7bb-212e-44fb-93df-d34822fd08c9.png",
      "51b77b2a-99ca-41ab-b784-f7c99d5df551.png", "54833efb-02f8-47ab-bce7-4d77aa728b73.png",
      "655ea716-0de0-44f5-b652-a848e14bf77d.png", "68b1465c-6da1-4e4b-8068-7d8ea68398e6.png",
      "6c266992-68e0-4976-b2cb-6e8d3c5e89bf.png", "6db3d042-b5df-402f-a3f1-1abf322d5cd9.png",
      "6e306324-6246-4f2a-bcf5-fc12711f5323.png", "720b328c-c1f1-486e-b89e-3fa0d4d0b990.png",
      "7269f465-4dfa-403b-896a-661f5a38adb5.png", "7422e0a6-7cd1-4702-ab03-df19877dab70.png",
      "7a6e99fa-2ca0-482b-be1e-d8d36b8370d0.png", "874441ed-958c-43df-a796-2687ff4210cd.png",
      "8b683377-8ad7-4091-a741-b40d63e60332.png", "8c1004e6-c260-4b8b-abe6-826744bf41b3.png",
      "8d5da085-05c3-40c6-9665-7c91704898c7.png", "a1ee8240-4bb5-47ee-bd62-02670f5b5b2b.png",
      "a2c84c7d-9ea6-471c-a7ec-15e47f3ac1f6.png", "a5556a90-f9fb-4977-a827-a693d7156989.png",
      "b1b18793-b5fd-4376-8476-478155fb0ada.png", "b843c618-2732-4fc9-9e8f-d12a4b42eab2.png",
      "bd5d5ec5-82c4-4123-a008-fead239d7d86.png", "c064c5aa-8bdd-4989-940a-dce85ba3dc35.png",
      "cb8e046d-e9d8-4098-8a24-c46cacb2e721.png", "d3cd4a7a-3050-4d6e-9104-bce8f4f5565a.png",
      "d70b0ee6-30b0-40d9-b973-9d1c7a0151b4.png", "d8226baf-2fce-4559-9b1b-7ea907297e79.png",
      "df53b41b-dd87-40cc-b6cc-e0846be344b2.png", "e99cc055-96d8-48cd-800e-4213eefa292a.png",
      "ea4b17f9-e15c-4625-890c-184c7d851c06.png", "f1520de1-d11b-4593-b6dd-6bb342db1a7e.png",
      "f43fff35-c6b9-43cb-96bf-ac645fceaeee.png", "f756fef5-05fa-42e0-9632-4117e89f819c.png",
      "fcf0662e-5518-47f1-b5fa-f14345eb435a.png", "fe7da822-77de-4922-af1b-aac6ef810904.png"
    ];

    const currentUnassigned = initialBoard.unassigned.filter(i => i.id.startsWith('local-'));
    initialBoard.unassigned = [...currentUnassigned];

    publicImgs.forEach(img => {
      if (!allKnownImages.has(img)) {
        initialBoard.unassigned.push({ id: `public-${img}`, name: img, displayName: img, url: `/${img}` });
      }
    });

    setBoard(initialBoard);
    setLoading(false);
  }, [selectedVersionId, versions]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const startList = Array.from(board[source.droppableId] || []);
    const endList = source.droppableId === destination.droppableId ? startList : Array.from(board[destination.droppableId] || []);

    const [moved] = startList.splice(source.index, 1);

    if (source.droppableId !== destination.droppableId) {
      endList.splice(destination.index, 0, moved);
      setBoard(prev => ({
        ...prev,
        [source.droppableId]: startList,
        [destination.droppableId]: endList,
      }));
    } else {
      startList.splice(destination.index, 0, moved);
      setBoard(prev => ({
        ...prev,
        [source.droppableId]: startList,
      }));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverlay(true);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverlay(false);
  };
  
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverlay(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files as FileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;

      const newItems: Item[] = await Promise.all(files.map(f => {
        return new Promise<Item>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve({
              id: `local-${Date.now()}-${Math.random()}`,
              name: toValidFirestoreId(`${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`),
              displayName: f.name,
              url: result
            });
          };
          reader.readAsDataURL(f);
        });
      }));

      setBoard(prev => ({
        ...prev,
        unassigned: [...(prev.unassigned || []), ...newItems]
      }));
    }
  };

  const removeItem = (droppableId: string, index: number) => {
    setBoard(prev => {
      const newList = [...(prev[droppableId] || [])];
      newList.splice(index, 1);
      return { ...prev, [droppableId]: newList };
    });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...localQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex].options = newOptions;
    setLocalQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...localQuestions];
    updated[qIndex].options.push('新选项');
    setLocalQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...localQuestions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    // Keep answer in bounds
    if (updated[qIndex].answer >= updated[qIndex].options.length) {
      updated[qIndex].answer = Math.max(0, updated[qIndex].options.length - 1);
    }
    setLocalQuestions(updated);
  };

  const addQuestion = () => {
    const newId = Date.now().toString();
    setLocalQuestions([
      ...localQuestions, 
      { id: newId, type: 'single', text: '新题目', options: ['选项A', '选项B', '选项C', '选项D'], answer: 0, score: 2 }
    ]);
  };

  const deleteQuestion = (index: number) => {
    if (window.confirm('确定要删除这道题吗？')) {
      const updated = [...localQuestions];
      updated.splice(index, 1);
      setLocalQuestions(updated);
    }
  };

  const createVersion = async () => {
    const name = window.prompt("请输入新题库名称：");
    if (!name) return;
    const newId = 'version-' + Date.now();
    const newVersion: QuizVersion = {
      id: newId,
      name: name,
      questions: []
    };
    
    if (password !== '5834') {
      alert(`没有操作权限`);
      return;
    }
    
    try {
      await setDoc(doc(db, 'quizVersions', newId), newVersion);
      setVersions([...versions, newVersion]);
      setSelectedVersionId(newId);
      alert('创建新题库成功！');
    } catch(err: any) {
      alert("创建失败: " + getFriendlyFirebaseMessage(err));
      reportFirestoreError(err, OperationType.CREATE, 'quizVersions');
    }
  };

  const deleteVersion = async () => {
    if (versions.length <= 1) {
      alert("请至少保留一个题库！");
      return;
    }
    if (window.confirm(`确定要删除题库 "${versionName}" 吗？此操作不可撤销将会同步删除云端数据和包含的图片！`)) {
      try {
        const versionToDelete = versions.find(v => v.id === selectedVersionId);
        if (versionToDelete && versionToDelete.questions) {
          // 删除关联的图片
          const imagesToDelete = new Set<string>();
          versionToDelete.questions.forEach(q => {
            if (q.images) q.images.forEach(img => imagesToDelete.add(img));
            if (q.optionImages) q.optionImages.forEach(img => imagesToDelete.add(img));
          });
          
          if (imagesToDelete.size > 0) {
            const deleteImagePromises = Array.from(imagesToDelete).filter(img => !img.startsWith('/') && !img.startsWith('data:')).map(img => deleteDoc(doc(db, 'images', img)).catch(e => console.error("Failed to delete image: ", e)));
            await Promise.all(deleteImagePromises);
          }
        }

        await deleteDoc(doc(db, 'quizVersions', selectedVersionId));
        const newVersions = versions.filter(v => v.id !== selectedVersionId);
        setVersions(newVersions);
        if (newVersions.length > 0) {
          setSelectedVersionId(newVersions[0].id);
        }
        alert('删除成功！关联数据和图片已同步删除。');
      } catch(err: any) {
        alert("删除失败: " + getFriendlyFirebaseMessage(err));
        reportFirestoreError(err, OperationType.DELETE, 'quizVersions');
      }
    }
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          
          if (parsed.questions && Array.isArray(parsed.questions)) {
            setLocalQuestions(parsed.questions);
            if (parsed.name) setVersionName(parsed.name);
            alert('导入成功！请确认无误后点击同步数据保存。');
          } else if (Array.isArray(parsed)) {
            setLocalQuestions(parsed);
            alert('导入成功！请确认无误后点击同步数据保存。');
          } else {
            alert('JSON 格式不正确：找不到题目列表。');
          }
        } catch (err) {
          alert('解析 JSON 失败: ' + String(err));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportJson = () => {
    const exportData = {
      id: selectedVersionId,
      name: versionName,
      questions: localQuestions
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-${versionName || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseTextToQuestions = (text: string): Question[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: Question[] = [];
    let currentQ: Partial<Question> | null = null;
    let currentOptions: string[] = [];
    const globalAnswers: { qNum?: number, ans: number, isTf?: boolean }[] = [];
    const seqAnswers: { ans: number, isTf?: boolean }[] = [];

    // Prepass to consume all unified answers at the bottom of the list
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let isAnswerLine = false;

        const rangeMatch = line.match(/^(\d+)[-~](\d+)[\.、:：\s]*([A-F对错√×\s]+)$/i);
        if (rangeMatch) {
            const s = parseInt(rangeMatch[1]);
            const e = parseInt(rangeMatch[2]);
            const ansStr = rangeMatch[3].replace(/\s+/g, '').toUpperCase();
            if (e - s + 1 === ansStr.length) {
                for(let j=0; j<ansStr.length; j++) {
                    const aStr = ansStr[j];
                    const isTf = aStr === '对' || aStr === '√' || aStr === '错' || aStr === '×';
                    let aCode = (aStr === '对' || aStr === '√') ? 0 : ((aStr === '错' || aStr === '×') ? 1 : aStr.charCodeAt(0) - 65);
                    globalAnswers.push({qNum: s+j, ans: aCode, isTf});
                }
                isAnswerLine = true;
            }
        }

        if (!isAnswerLine && /^[\d\.、:：\sA-F对错√×]+$/i.test(line)) {
            const inlineAnsRegex = /(\d+)[\.、:：\s]*([A-F对错√×])/gi;
            const matches = Array.from(line.matchAll(inlineAnsRegex));
            if (matches.length > 0) {
                 matches.forEach(m => {
                      const aStr = m[2].toUpperCase();
                      const isTf = aStr === '对' || aStr === '√' || aStr === '错' || aStr === '×';
                      let aCode = (aStr === '对' || aStr === '√') ? 0 : ((aStr === '错' || aStr === '×') ? 1 : aStr.charCodeAt(0) - 65);
                      globalAnswers.push({qNum: parseInt(m[1]), ans: aCode, isTf});
                 });
                 isAnswerLine = true;
            }
        }

        if (!isAnswerLine) {
            const pureAnsMatch = line.match(/^(?:参考答案|答案|答案解析|参考答案及解析)?[：:\s]*([A-F对错√×\s]{2,})$/i);
            if (pureAnsMatch) {
                let str = pureAnsMatch[1].trim();
                let ansList = [];
                if (/\s/.test(str)) {
                     ansList = str.split(/\s+/).filter(Boolean);
                } else {
                     ansList = str.split('');
                }
                
                const currentLineAnswers = [];
                for (let j = 0; j < ansList.length; j++) {
                     const aStr = ansList[j].trim().toUpperCase();
                     if (!aStr) continue;
                     const isTf = aStr === '对' || aStr === '√' || aStr === '错' || aStr === '×';
                     let aCode = (aStr === '对' || aStr === '√') ? 0 : ((aStr === '错' || aStr === '×') ? 1 : aStr.charCodeAt(0) - 65);
                     currentLineAnswers.push({ans: aCode, isTf});
                }
                seqAnswers.unshift(...currentLineAnswers);
                isAnswerLine = true;
            }
        }

        if (!isAnswerLine && /^(?:参考答案|答案|答案解析|参考答案及解析)[：:\s]*$/.test(line)) {
            isAnswerLine = true;
        }

        if (isAnswerLine) {
            lines[i] = '';
        }
    }

    const filteredLines = lines.filter(Boolean);
    
    for (let i = 0; i < filteredLines.length; i++) {
        const line = filteredLines[i];

        const qMatch = line.match(/^(\d+)[\.、]?\s+(.*)/) || line.match(/^(\d+)[\.、]\s*(.*)/);
        if (qMatch) {
            if (currentQ) {
                if (currentOptions.length > 0) {
                    currentQ.options = currentOptions;
                } else if (currentQ.type === 'tf') {
                    currentQ.options = ['正确', '错误'];
                } else {
                    currentQ.options = ['选项A', '选项B', '选项C', '选项D'];
                }
                parsed.push(currentQ as Question);
            }
            currentQ = {
                id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9) + '-' + i,
                qNum: parseInt(qMatch[1]),
                type: 'single',
                text: qMatch[2],
                options: [],
                answer: 0,
                score: 2,
                images: [],
                optionImages: []
            } as any;
            currentOptions = [];
            continue;
        }

        if (!currentQ) continue;

        const ansMatch = line.match(/^答案[：:\s]*([A-Z对错√×])/i);
        if (ansMatch) {
            const ansStr = ansMatch[1].toUpperCase();
            if (ansStr === '对' || ansStr === '√') {
                currentQ.type = 'tf';
                currentQ.answer = 0;
            } else if (ansStr === '错' || ansStr === '×') {
                currentQ.type = 'tf';
                currentQ.answer = 1;
            } else {
                currentQ.type = 'single';
                currentQ.answer = ansStr.charCodeAt(0) - 65;
            }
            continue;
        }

        if (/^[A-F]([\.、:：]|\s+)/.test(line) && currentQ && currentOptions.length < 10) {
            const parts = line.split(/(?:\s+)?(?=[A-F](?:[\.、:：]|\s+))/).map(s => s.trim()).filter(s => /^[A-F](?:[\.、:：]|\s+)?/.test(s));
            if (parts.length > 0) {
                parts.forEach(part => {
                    const optMatch = part.match(/^[A-F](?:[\.、:：]|\s+)?\s*(.*)/);
                    if (optMatch) currentOptions.push(optMatch[1].trim());
                });
                continue;
            }
        }

        if (!line.startsWith('答案') && !line.startsWith('参考答案')) {
            currentQ.text += '\n' + line;
        }
    }

    if (currentQ) {
        if (currentOptions.length > 0) {
            currentQ.options = currentOptions;
        } else if (currentQ.type === 'tf') {
            currentQ.options = ['正确', '错误'];
        } else {
            currentQ.options = ['选项A', '选项B', '选项C', '选项D'];
        }
        parsed.push(currentQ as Question);
    }
    
    parsed.forEach((q, idx) => {
        let matchedAns;
        // Try precise qNum mapping first
        const pAns = globalAnswers.find(ga => ga.qNum === (q as any).qNum);
        if (pAns) {
            matchedAns = pAns;
        } else if (seqAnswers.length > idx) {
            matchedAns = seqAnswers[idx];
        }

        if (matchedAns) {
             q.answer = matchedAns.ans;
             if (matchedAns.isTf) {
                 q.type = 'tf';
                 q.options = ['正确', '错误'];
             } else {
                 // Convert TF back to single if global answer indicates it's single choice A/B/C/D
                 if (q.type === 'tf') {
                     q.type = 'single';
                     q.options = ['选项A', '选项B', '选项C', '选项D']; 
                 }
             }
        }
        
        if (q.answer === undefined || isNaN(q.answer) || q.answer < 0 || q.answer >= (q.options?.length || 1)) {
            q.answer = 0;
        }
        delete (q as any).qNum;
    });

    return parsed;
  };

  const handleTextImportSubmit = async () => {
    if (!importText.trim()) return;
    setImportLoading(true);
    
    // 模拟一下进度反馈
    await new Promise(r => setTimeout(r, 500));
    
    try {
      const questions = parseTextToQuestions(importText);
      if (questions && questions.length > 0) {
        const shouldOverwrite = window.confirm(`成功提取出 ${questions.length} 道题目！\n\n点击“确定”清空当前题目并替换为您导入的题目；\n点击“取消”则将新题目追加到当前题库的末尾。`);
        
        setBoard(prev => {
          const pb = shouldOverwrite ? { unassigned: [] } : { ...prev };
          questions.forEach(q => {
            pb[`${q.id}-body`] = [];
            pb[`${q.id}-options`] = [];
          });
          return pb;
        });
        
        if (shouldOverwrite) {
            setLocalQuestions(questions);
        } else {
            setLocalQuestions([...localQuestions, ...questions]);
        }
        
        // Let's actually save right away so they don't lose it if they exit
        // We will call saveDataAndFiles logic later, but for now we updated state.
        
        setTextImportModalOpen(false);
      } else {
        alert('未能识别出任何题目格式。请确保文本采用了如 "1. " 作为题号开头，并指定了 "答案：A"。');
      }
    } catch (err: any) {
      alert('解析出错: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const saveDataAndFiles = async () => {
    if (password !== '5834') {
      alert(`没有操作权限`);
      return;
    }

    try {
      // 收集并上传新图片至 Firebase
      const uploads: Promise<void>[] = [];
      const uploadedNameMap = new Map<string, string>();
      Object.values(board).forEach((list: any) => {
        list.forEach(item => {
          if (item.url.startsWith('data:image/')) {
            const safeName = toValidFirestoreId(item.name || item.displayName || 'img');
            uploadedNameMap.set(item.name, safeName);
            const docRef = doc(db, 'images', safeName);
            uploads.push(setDoc(docRef, { content: item.url }));
          }
        });
      });

      if (uploads.length > 0) {
        alert(`正在上传 ${uploads.length} 张图片到 Firebase...`);
        await Promise.all(uploads);
      }

      // 更新对应的 QuizVersion
      const versionToUpdate = {
        id: selectedVersionId,
        name: versionName,
        questions: localQuestions.map(q => {
          return {
            ...q,
            images: (board[`${q.id}-body`] || []).map(i => uploadedNameMap.get(i.name) || i.name),
            optionImages: (board[`${q.id}-options`] || []).map(i => uploadedNameMap.get(i.name) || i.name)
          };
        })
      };

      await setDoc(doc(db, 'quizVersions', selectedVersionId), versionToUpdate);

      alert('同步到 Firebase 成功！题库数据已更新。(刷新页面即可生效)');
      onClose();
    } catch (err: any) {
      console.error(err);
      reportFirestoreError(err, OperationType.UPDATE, 'Firebase Sync');
      alert('保存出错: ' + getFriendlyFirebaseMessage(err));
    }
  };

  if (loading) return <div className="fixed inset-0 z-[60] bg-white flex items-center justify-center font-bold">加载中...</div>;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-[#F1F5F9] flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOverlay && (
        <div className="absolute inset-0 z-[100] bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <Plus className="w-12 h-12 text-blue-500" />
            <span className="text-xl font-bold text-blue-600">松开鼠标上传图片</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 bg-white p-4 border-b-2 border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3 px-4">
          <Edit3 className="w-8 h-8 text-[#FFD600]" />
          <div>
            <h1 className="text-xl font-bold font-sans">题库管理面板</h1>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <div className="relative inline-flex items-center">
                <select 
                  className="appearance-none bg-blue-50 border border-blue-200 text-blue-700 py-1 pl-3 pr-8 rounded-md outline-none text-xs font-bold cursor-pointer"
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                >
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 text-blue-600 pointer-events-none" />
              </div>
              <button 
                onClick={createVersion}
                className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-50"
              >
                新建题库
              </button>
              <button 
                onClick={deleteVersion}
                className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50"
              >
                删除当前题库
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4">
          {currentUserEmail ? (
            <button onClick={handleLogout} className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-100 transition-colors">
              已登录：{currentUserEmail}（退出）
            </button>
          ) : (
            <button onClick={handleGoogleLogin} className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-xl text-xs hover:bg-amber-100 transition-colors">
              Google 登录
            </button>
          )}
          <button onClick={() => setTextImportModalOpen(true)} className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity tooltip" title="粘贴文章/文本，自动解析为题目">
            <FileJson className="w-4 h-4"/> "文本导入"
          </button>
          <button onClick={handleImportJson} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors tooltip" title="从 JSON 文件导入题目">
            <Upload className="w-4 h-4"/> 导入 JSON
          </button>
          <button onClick={handleExportJson} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors tooltip" title="导出当前题库为 JSON 文件">
            <FileJson className="w-4 h-4"/> 导出 JSON
          </button>
          <button onClick={saveDataAndFiles} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-transform"><Download className="w-4 h-4"/> 部署并同步数据</button>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-xl hover:bg-slate-200"><X className="w-5 h-5"/></button>
        </div>
      </div>

      {/* "Text Import Modal" */}
      {textImportModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <FileJson className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">文本一键提取题目</h2>
                  <p className="text-xs text-slate-500 mt-1">本功能完全免费在本地运行，使用代码规则（正则）提取题干、选项和答案</p>
                </div>
              </div>
              <button 
                onClick={() => setTextImportModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/50 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
                disabled={importLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-full min-h-[300px] border-2 border-slate-200 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all text-slate-700 custom-scrollbar"
                placeholder="在此粘贴包含题目的纯文本。例如：
1. 中国的首都是哪里？
A. 上海
B. 北京
C. 广州
D. 深圳
答案：B"
                disabled={importLoading}
              />
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setTextImportModalOpen(false)}
                className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={importLoading}
              >
                取消
              </button>
              <button 
                onClick={handleTextImportSubmit}
                disabled={!importText.trim() || importLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在全力解析...
                  </>
                ) : (
                  <>
                    <FileJson className="w-5 h-5" />
                    开始提取题目
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body: Drag Drop Context */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          
          {/* 左侧：图库 */}
          <div className="w-1/3 min-w-[300px] max-w-[400px] border-r-2 border-slate-200 bg-white flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="font-bold text-slate-800 text-lg">图库 / 拖拽上传图片</h2>
              <p className="text-xs text-slate-500 mt-1">可以将本地图片直接拖拽到此面板</p>
            </div>
            
            <Droppable droppableId="unassigned" direction="vertical">
              {(provided, snapshot) => (
                <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}>
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="grid grid-cols-2 gap-3 min-h-full"
                  >
                    {(board.unassigned || []).map((item, index) => (
                      <React.Fragment key={item.id}>
                      <Draggable draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border-2 flex items-center justify-center ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-105 z-10' : 'border-slate-200 hover:border-slate-300'}`}
                            style={provided.draggableProps.style}
                          >
                            <img src={item.url} alt="" className="max-w-full max-h-full object-contain p-2 pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.displayName || item.name}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeItem('unassigned', index); }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600 transition-opacity shadow-md"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>

          {/* 右侧：题目编辑列表 */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="bg-white px-6 py-4 border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-bold text-slate-700 shrink-0">题库名称：</span>
                  <input 
                    type="text" 
                    value={versionName} 
                    onChange={(e) => setVersionName(e.target.value)}
                    className="flex-1 border border-slate-300 rounded px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {localQuestions.map((q, qIndex) => (
                <div key={q.id} className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative group">
                  <button 
                    onClick={() => deleteQuestion(qIndex)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除本题"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  {/* 题目信息编辑 */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4 pr-12">
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">[{qIndex + 1}] ID: {q.id}</span>
                      <select 
                        value={q.type} 
                        onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                        className="bg-white border border-slate-300 text-slate-700 py-1 px-2 rounded text-sm font-bold shadow-sm"
                      >
                        <option value="single">单选题 (Single)</option>
                        <option value="tf">判断题 (True/False)</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-600">分数:</span>
                        <input 
                          type="number" 
                          value={q.score} 
                          onChange={(e) => updateQuestion(qIndex, 'score', Number(e.target.value))}
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 block">题干文本</label>
                      <textarea 
                        value={q.text} 
                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                        placeholder="请输入题干内容..."
                      />
                    </div>
                  </div>

                  {/* 选项与图片配图编辑区 */}
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    
                    {/* 选项列表 */}
                    <div className="flex-1 p-6 space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">编辑选项与答案</h3>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name={`answer-${q.id}`} 
                            checked={q.answer === optIndex} 
                            onChange={() => updateQuestion(qIndex, 'answer', optIndex)}
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                          />
                          <div className="font-bold text-slate-500 shrink-0 w-6">{String.fromCharCode(65 + optIndex)}.</div>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                            placeholder={`选项 ${String.fromCharCode(65 + optIndex)} 内容 (如有配图可留空)`}
                          />
                          <button onClick={() => removeOption(qIndex, optIndex)} className="text-red-400 hover:text-red-600 shrink-0">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {q.type !== 'tf' && (
                        <button onClick={() => addOption(qIndex)} className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 mt-2">
                          <Plus className="w-4 h-4" /> 添加一个选项
                        </button>
                      )}
                    </div>

                    {/* 配图区 */}
                    <div className="flex-1 p-6 flex flex-col gap-6 bg-slate-50/30">
                       <div className="flex flex-col gap-2">
                         <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                            <span>题干配图 (正文穿插)</span>
                         </div>
                         <Droppable droppableId={`${q.id}-body`} direction="horizontal">
                           {(provided, snapshot) => (
                             <div className={`relative overflow-hidden transition-colors min-h-[100px] border-2 border-dashed rounded-xl p-2 ${snapshot.isDraggingOver ? 'bg-green-50 border-green-300' : 'border-slate-200 bg-white'}`}>
                               {board[`${q.id}-body`]?.length === 0 && !snapshot.isDraggingOver && (
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
                                {board[`${q.id}-body`]?.map((item, index) => (
                                  <React.Fragment key={item.id}>
                                  <Draggable draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`group shrink-0 w-20 h-20 bg-white rounded-lg border-2 flex items-center justify-center relative overflow-hidden ${snapshot.isDragging ? 'border-blue-500 shadow-xl z-10' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}
                                        style={provided.draggableProps.style}
                                      >
                                        <img src={item.url} alt="" className="max-w-full max-h-full object-contain p-1 pointer-events-none" />
                                        <button
                                          onClick={(e) => { e.stopPropagation(); removeItem(`${q.id}-body`, index); }}
                                          className="absolute top-0 right-0 w-5 h-5 bg-red-500/80 text-white rounded-bl opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600 transition-opacity z-20"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                  </React.Fragment>
                                ))}
                                {provided.placeholder}
                              </div>
                             </div>
                           )}
                         </Droppable>
                       </div>

                       {q.type !== 'tf' && (
                         <div className="flex flex-col gap-2">
                           <div className="text-xs font-bold text-slate-500">选项配图 (分别在此处对应 A B C D)</div>
                           <Droppable droppableId={`${q.id}-options`} direction="horizontal">
                             {(provided, snapshot) => (
                               <div className={`relative overflow-hidden transition-colors min-h-[100px] border-2 border-dashed rounded-xl p-2 ${snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-300' : 'border-slate-200 bg-white'}`}>
                                  {board[`${q.id}-options`]?.length === 0 && !snapshot.isDraggingOver && (
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
                                  {board[`${q.id}-options`]?.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                    <Draggable draggableId={item.id} index={index}>
                                      {(provided, snapshot) => {
                                        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
                                        const letter = letters[index] || (index+1);
                                        return (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`group shrink-0 w-20 h-20 bg-white rounded-lg border-2 flex items-center justify-center relative overflow-hidden ${snapshot.isDragging ? 'border-blue-500 shadow-xl z-10' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}
                                            style={provided.draggableProps.style}
                                          >
                                            <img src={item.url} alt="" className="max-w-full max-h-full object-contain p-1 pointer-events-none" />
                                            <div className="absolute top-0 left-0 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br flex items-center justify-center">
                                              {letter}
                                            </div>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); removeItem(`${q.id}-options`, index); }}
                                              className="absolute top-0 right-0 w-5 h-5 bg-red-500/80 text-white rounded-bl opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600 transition-opacity z-20"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        );
                                      }}
                                    </Draggable>
                                    </React.Fragment>
                                  ))}
                                  {provided.placeholder}
                                  </div>
                               </div>
                             )}
                           </Droppable>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={addQuestion}
                className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
               >
                <Plus className="w-5 h-5" /> 添加新题目
              </button>
              
            </div>
          </div>
          
        </div>
      </DragDropContext>
    </div>
  );
};

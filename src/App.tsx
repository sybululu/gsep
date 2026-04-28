import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, RotateCcw, AlertCircle, Play, ChevronDown, Loader2 } from 'lucide-react';
import { quizVersions as initialQuizVersions, QuizVersion, Question } from './data';
import { QuestionImage } from './components/QuestionImage';

import { ImageMatcher } from './components/ImageMatcher';
import { supabase, QUIZ_VERSIONS_TABLE } from './supabase';

const ADMIN_PASSWORD = '5834';
const PUBLIC_IMAGE_RE = /^[\w-]+\.(png|jpe?g|gif|webp|svg)$/i;

const OptionImage = ({ optImg, versionId }: { optImg: string; versionId: string }) => {
  const [srcPath, setSrcPath] = useState('');
  const [errorUrl, setErrorUrl] = useState(false);

  useEffect(() => {
    if (optImg.startsWith('/') || optImg.startsWith('data:')) {
      setSrcPath(optImg);
    } else if (PUBLIC_IMAGE_RE.test(optImg)) {
      setSrcPath(`/${optImg}`);
    } else {
      // Fetch from Supabase
      const fetchImage = async () => {
        try {
          const { data, error } = await supabase
            .from('images')
            .select('content')
            .eq('version_id', versionId)
            .eq('image_id', optImg)
            .single();
          if (data?.content) {
            setSrcPath(data.content);
          } else {
            setSrcPath(`/${optImg}`);
          }
        } catch (e) {
          setSrcPath(`/${optImg}`);
        }
      };
      fetchImage();
    }
  }, [optImg, versionId]);

  if (errorUrl || !srcPath) return null;

  return (
    <div className="mt-2 text-center p-2 bg-white border border-zinc-200 rounded max-w-[300px] mx-auto">
      <img src={srcPath} alt="选项配图" className="max-h-48 object-contain" onError={() => setErrorUrl(true)} />
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<'start' | 'quiz' | 'result'>('start');
  const [showImageMatcher, setShowImageMatcher] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  const [versions, setVersions] = useState<QuizVersion[]>(initialQuizVersions);
  const [currentVersionId, setCurrentVersionId] = useState(initialQuizVersions[0].id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.lang = 'zh-CN';
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
  }, []);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const { data, error } = await supabase
          .from(QUIZ_VERSIONS_TABLE)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          setVersions(data);
          if (!data.find((v: QuizVersion) => v.id === currentVersionId)) {
            setCurrentVersionId(data[0].id);
          }
        }
      } catch (e) {
        console.warn("Failed fetching from Supabase, using local data.", e);
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  const currentVersion = versions.find(v => v.id === currentVersionId) || versions[0];
  const questions = currentVersion?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // 动态计算各类题目数量和分数
  const singleQuestions = questions.filter(q => q.type === 'single');
  const tfQuestions = questions.filter(q => q.type === 'tf');
  const singleCount = singleQuestions.length;
  const tfCount = tfQuestions.length;
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  const handleOpenImageMatcher = async () => {
    const pwd = window.prompt("请输入管理员密码：");
    if (!pwd) return;
    if (pwd === ADMIN_PASSWORD) {
      setAdminPassword(ADMIN_PASSWORD);
      setShowImageMatcher(true);
    } else {
      alert("密码错误！");
    }
  };

  const handleStart = () => {
    setScreen('quiz');
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleRestartQuiz = () => {
    if (window.confirm("确定要重新开始考试吗？当前的答题记录将丢失。")) {
      setCurrentQuestionIndex(0);
      setAnswers({});
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setScreen('result');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.answer) {
        score += q.score;
      }
    });
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFD600]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-[#1A1A1A] font-sans selection:bg-[#FFD600] selection:text-black flex flex-col notranslate" translate="no">
      {showImageMatcher && <ImageMatcher password={adminPassword} initialVersions={versions} onClose={() => {
        setShowImageMatcher(false);
        // Reload data after edit
        window.location.reload();
      }} />}
      
      {/* Header */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black rounded-lg bg-[#FFD600] flex items-center justify-center text-black font-black text-xl">
              G
            </div>
            <h1 className="text-2xl font-black tracking-tight hidden sm:block text-black uppercase">GESP 图形化编程一级</h1>
          </div>
          
          {screen === 'start' && (
            <div className="relative inline-flex items-center ml-4">
              <select 
                className="appearance-none bg-blue-50 border-2 border-black text-black py-2 pl-4 pr-10 rounded-xl outline-none text-sm font-bold cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-transform"
                value={currentVersionId}
                onChange={(e) => setCurrentVersionId(e.target.value)}
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 text-black pointer-events-none" />
            </div>
          )}

          <div className="flex-1"></div>
          <button 
            onClick={handleOpenImageMatcher}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border-2 border-black rounded-xl font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-[2px] active:translate-x-[2px] active:shadow-none ml-4"
          >
            🖼️ 管理题库
          </button>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {screen === 'start' && (
          <div className="bg-white rounded-[32px] border-4 border-black p-8 sm:p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-[#FFD600] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-black mb-4">开始答题</h2>
            <p className="text-lg font-bold text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
              本次测试包含 {singleCount > 0 ? `${singleCount} 道单选题` : ''}{singleCount > 0 && tfCount > 0 ? '和' : ''}{tfCount > 0 ? `${tfCount} 道判断题` : ''}{totalQuestions > 0 ? `，满分 ${totalScore} 分` : '。暂无题目可作答'}。
            </p>
            <button
              onClick={handleStart}
              disabled={totalQuestions === 0}
              className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 hover:translate-y-[-2px] text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-8 py-4 rounded-full font-black uppercase transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>进入测试</span>
            </button>
          </div>
        )}

        {screen === 'quiz' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            {totalQuestions === 0 || !currentQuestion ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-4">
                <p className="text-xl font-bold text-zinc-500">当前题库为空，没有可以作答的题目。</p>
                <button onClick={() => setScreen('start')} className="px-6 py-3 bg-[#3B82F6] text-white font-bold rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0 active:shadow-none transition-all">返回主页</button>
              </div>
            ) : (
              <>
                <div className="w-full shrink-0 h-4 bg-white border-2 border-black rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-[#EC4899] border-r-2 border-black transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex) / totalQuestions) * 100}%` }}
                  ></div>
                </div>

                <div className="bg-white rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-hidden mb-6 flex-1 flex flex-col">
                  <div className="p-6 sm:p-8 flex flex-col gap-6 flex-1">
                    <div className="flex justify-between items-start">
                      <span className="px-4 py-1 bg-[#EC4899] text-white border-2 border-black rounded-full text-xs font-black uppercase">
                        Question {(currentQuestionIndex + 1).toString().padStart(2, '0')} of {totalQuestions}
                      </span>
                      <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{currentQuestion.type === 'single' ? '单选题' : '判断题'} ({currentQuestion.score}分)</span>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight">
                      {currentQuestion.text}
                    </h2>

                    <QuestionImage id={currentQuestion.id} fallbackText={currentQuestion.imageFallbackText} images={currentQuestion.images} versionId={currentVersionId} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {currentQuestion.options.map((option, idx) => {
                        const isSelected = answers[currentQuestion.id] === idx;
                        const displayOption = option?.replace ? option.replace(/^[A-D]、/, '') : String(option);
                        const optImg = currentQuestion.optionImages?.[idx];
                        const isDefaultText = option === `选项${String.fromCharCode(65 + idx)}` || (typeof option === 'string' && option.trim() === String.fromCharCode(65 + idx)) || (typeof option === 'string' && option.trim() === '');
                        const hideText = isDefaultText;
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswerSelect(idx)}
                            className={`p-4 border-2 border-black rounded-xl flex items-center gap-4 transition-all group overflow-hidden ${
                              isSelected 
                                ? 'bg-[#3B82F6] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]' 
                                : 'bg-white hover:bg-[#3B82F6] hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 shrink-0 rounded-full border-2 border-black flex items-center justify-center font-black transition-colors ${
                              isSelected ? 'bg-white text-black' : 'group-hover:bg-white group-hover:text-black bg-zinc-100 text-black'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="flex flex-col items-start w-full">
                              {!hideText && <span className="font-bold text-left leading-snug">{displayOption}</span>}
                              {optImg && (
                                <OptionImage optImg={optImg} versionId={currentVersionId} />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex justify-center gap-4 mt-8 px-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="px-8 py-3 bg-white border-2 border-black rounded-full font-black text-sm uppercase hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                  >
                    上一题
                  </button>
                  
                  <button
                    onClick={handleNext}
                    disabled={answers[currentQuestion.id] === undefined}
                    className="px-8 py-3 bg-black text-white border-2 border-black rounded-full font-black text-sm uppercase hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(59,130,246,1)] disabled:shadow-none"
                  >
                    {isLastQuestion ? '提交试卷' : '下一题'}
                  </button>
                </div>

                <div className="shrink-0 flex justify-between mt-12 px-2 border-t-2 border-dashed border-zinc-300 pt-6">
                  <button
                    onClick={() => setScreen('start')}
                    className="px-6 py-2 bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-600 hover:bg-red-100 rounded-full font-bold text-sm transition-all"
                  >
                    退出考试
                  </button>
                  <button
                    onClick={handleRestartQuiz}
                    className="px-6 py-2 bg-zinc-50 text-zinc-600 border-2 border-zinc-200 hover:border-black hover:text-black rounded-full font-bold text-sm transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />重新考试
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'result' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#FFD600] rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-8 sm:p-12 text-center mb-12 flex flex-col items-center">
              <span className="text-sm font-black uppercase tracking-widest mb-2 px-4 py-1 bg-white border-2 border-black rounded-full">最终得分</span>
              
              <div className="flex justify-center flex-col items-center gap-2 mt-4 mb-2">
                <span className="text-8xl font-black text-black leading-none tracking-tighter">{calculateScore()}</span>
                <span className="text-xl font-bold text-zinc-600">out of {totalScore}</span>
              </div>
              
              <div className="w-full max-w-sm bg-white/50 h-3 rounded-full mt-4 border-2 border-black overflow-hidden">
                <div className="bg-black h-full rounded-full" style={{ width: `${(calculateScore() / totalScore) * 100}%` }}></div>
              </div>

              <button
                onClick={handleStart}
                className="mt-8 w-full max-w-sm py-4 bg-white border-4 border-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase hover:translate-y-[-2px] hover:bg-zinc-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
              >
                <RotateCcw className="w-5 h-5" />
                <span>重做模拟测试</span>
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight text-black px-2 mb-6">答案解析对照</h3>
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.answer;
                
                const optCorrect = q.options[q.answer] || '';
                const displayCorrectAnswer = optCorrect.replace(/^[A-D]、/, '');
                
                const optUser = userAnswer !== undefined ? (q.options[userAnswer] || '') : '';
                const displayUserAnswer = userAnswer !== undefined ? optUser.replace(/^[A-D]、/, '') : '未作答';
                
                const isCorrectDefaultText = optCorrect === `选项${String.fromCharCode(65 + q.answer)}` || optCorrect.trim() === String.fromCharCode(65 + q.answer) || optCorrect.trim() === '';
                const hideCorrectText = isCorrectDefaultText;

                const isUserDefaultText = userAnswer !== undefined && (optUser === `选项${String.fromCharCode(65 + userAnswer)}` || optUser.trim() === String.fromCharCode(65 + userAnswer) || optUser.trim() === '');
                const hideUserText = isUserDefaultText;
                
                return (
                  <div key={q.id} className="bg-white rounded-[32px] border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <div className="shrink-0 flex items-center justify-center">
                        {isCorrect ? (
                          <div className="w-12 h-12 rounded-full bg-[#3B82F6] border-2 border-black text-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#EF4444] border-2 border-black text-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-zinc-100 border-2 border-black rounded-full text-xs font-black uppercase">第 {(idx + 1).toString().padStart(2, '0')} 题</span>
                          <span className="text-xs font-bold text-zinc-400">({q.score}分)</span>
                        </div>
                        <h4 className="text-xl font-bold leading-tight mb-6">{q.text}</h4>
                        
                        <QuestionImage id={q.id} fallbackText={q.imageFallbackText} images={q.images} versionId={currentVersionId} />

                        <div className="mt-8 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 p-4 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl">
                            <span className="text-xs font-black uppercase text-zinc-500 whitespace-nowrap mt-1">你的答案</span>
                            <span className={`font-bold ${isCorrect ? 'text-[#3B82F6]' : 'text-[#EF4444]'}`}>
                              {!hideUserText && <div>{userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) + ". " + displayUserAnswer : '未作答'}</div>}
                              {hideUserText && <div>{userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) + ". " : '未作答'}</div>}
                              {userAnswer !== undefined && q.optionImages?.[userAnswer] && (
                                <OptionImage optImg={q.optionImages[userAnswer]} versionId={currentVersionId} />
                              )}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 p-4 bg-[#A78BFA]/10 border-2 border-dashed border-[#A78BFA] rounded-2xl">
                              <span className="text-xs font-black uppercase text-[#A78BFA] whitespace-nowrap mt-1">正确答案</span>
                              <span className="font-bold text-black">
                                {!hideCorrectText && <div>{String.fromCharCode(65 + q.answer)}. {displayCorrectAnswer}</div>}
                                {hideCorrectText && <div>{String.fromCharCode(65 + q.answer)}. </div>}
                                {q.optionImages?.[q.answer] && (
                                  <OptionImage optImg={q.optionImages[q.answer]} versionId={currentVersionId} />
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


import type { Question, QuizVersion } from '../data';

export const normalizeQuizQuestion = (question: Partial<Question>, index: number): Question => {
  const type: Question['type'] = question.type === 'tf' ? 'tf' : 'single';
  const fallbackOptions = type === 'tf' ? ['正确', '错误'] : ['A', 'B', 'C', 'D'];
  const rawOptions = Array.isArray(question.options) && question.options.length >= 2
    ? question.options.map(option => String(option ?? '').trim())
    : fallbackOptions;
  const options = type === 'tf' ? ['正确', '错误'] : rawOptions;
  // 兼容字符串和数字类型的答案
  const rawAnswer = question.answer;
  const answer = (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '')
    ? Number(rawAnswer)
    : 0;

  return {
    id: String(question.id || `q-${Date.now()}-${index}`),
    type,
    text: String(question.text ?? '').trim() || '新题目',
    options,
    answer: Math.max(0, Math.min(answer, options.length - 1)),
    score: Number.isFinite(question.score) ? Number(question.score) : (type === 'tf' ? 4 : 3),
    images: Array.isArray(question.images) ? question.images.filter(Boolean).map(String) : [],
    optionImages: type === 'tf' ? [] : (Array.isArray(question.optionImages) ? question.optionImages.filter(Boolean).map(String) : []),
    imageFallbackText: question.imageFallbackText,
  };
};

export const normalizeQuizQuestions = (questions: Question[]): Question[] => questions.map(normalizeQuizQuestion);

export const buildQuizVersion = (id: string, name: string, questions: Question[]): QuizVersion => ({
  id,
  name: name.trim() || '未命名题库',
  questions: normalizeQuizQuestions(questions).map(question => ({
    id: question.id,
    type: question.type,
    text: question.text,
    options: question.type === 'tf' ? ['正确', '错误'] : question.options,
    answer: question.answer,
    score: question.type === 'tf' ? 4 : question.score,
    images: question.images.filter(Boolean),
    optionImages: question.type === 'tf' ? [] : question.optionImages.filter(Boolean),
    ...(question.imageFallbackText ? { imageFallbackText: question.imageFallbackText } : {}),
  })),
});

export const validateQuizVersion = (quiz: QuizVersion) => {
  if (!quiz.id) throw new Error('题库 ID 为空，无法同步。');
  if (!quiz.name.trim()) throw new Error('题库名称不能为空。');
  if (quiz.questions.length > 300) throw new Error('题目数量超过 300 道，请拆分成多个题库。');

  quiz.questions.forEach((question, index) => {
    if (!question.text.trim()) throw new Error(`第 ${index + 1} 题题干为空。`);
    if (question.text.length > 8000) throw new Error(`第 ${index + 1} 题题干超过 8000 字。`);
    if (question.options.length < 2 || question.options.length > 10) throw new Error(`第 ${index + 1} 题选项数量必须在 2 到 10 个之间。`);
    if (question.answer < 0 || question.answer >= question.options.length) throw new Error(`第 ${index + 1} 题答案序号超出选项范围。`);
  });
};

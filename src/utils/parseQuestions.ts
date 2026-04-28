import type { Question } from '../components/questionBank/types';

const normalizeLine = (line: string) =>
  line.replace(/\u00a0/g, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// 从章节中提取答案映射
const extractAnswers = (section: string): Record<number, { ans: number; isTf: boolean }> => {
  const answerMap: Record<number, { ans: number; isTf: boolean }> = {};
  
  // 匹配 题号 ... 答案 ... 格式
  const match = section.match(/题号\s*([\s\S]*?)答案\s*([\s\S]*?)(?=\n\s*1[、.]|$)/);
  if (!match) return answerMap;

  const nums = match[1].match(/\d+/g) || [];
  const answers = match[2].match(/[A-D]|√|×/g) || [];

  nums.forEach((num, index) => {
    const aStr = (answers[index] || '').toUpperCase();
    if (!aStr) return;
    
    const isTf = aStr === '√' || aStr === '×';
    const aCode = isTf ? (aStr === '√' ? 0 : 1) : (aStr.charCodeAt(0) - 65);
    
    answerMap[parseInt(num)] = { ans: aCode, isTf };
  });

  return answerMap;
};

// 提取章节内容
const extractSection = (text: string, startTitle: string, endTitle?: string): string => {
  const start = text.indexOf(startTitle);
  if (start === -1) return '';

  const end = endTitle ? text.indexOf(endTitle, start) : -1;
  return end === -1 ? text.slice(start) : text.slice(start, end);
};

// 提取分值
const extractScore = (line: string): number | null => {
  const match = line.match(/每题\s*(\d+)\s*[分]?/);
  return match ? parseInt(match[1]) : null;
};

export const parseTextToQuestions = (rawText: string): Question[] => {
  const text = rawText
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  const parsed: Question[] = [];

  // 提取单选题区域
  const singleSection = extractSection(text, '一、单选题', '二、判断题');
  const tfSection = extractSection(text, '二、判断题', '三、编程题');

  // 提取分值
  let singleScore = 2;
  let tfScore = 4;
  
  const singleScoreMatch = singleSection.match(/每题\s*(\d+)\s*[分]?/);
  if (singleScoreMatch) singleScore = parseInt(singleScoreMatch[1]);
  
  const tfScoreMatch = tfSection.match(/每题\s*(\d+)\s*[分]?/);
  if (tfScoreMatch) tfScore = parseInt(tfScoreMatch[1]);

  // 提取单选题答案
  const singleAnswers = extractAnswers(singleSection);

  // 按题号分割单选题
  const singleBlocks = singleSection
    .split(/\n(?=\d+[、.])/)
    .filter(block => /^\d+[、.]/.test(block.trim()));

  singleBlocks.forEach((block, idx) => {
    const numberMatch = block.match(/^(\d+)[、.]/);
    if (!numberMatch) return;

    const number = parseInt(numberMatch[1]);
    
    // 逐个匹配 A、B、C、D 选项，确保每个都有值（图片留空）
    const optA = block.match(/A[、.]\s*([\s\S]*?)(?=\s*B[、.]|$)/)?.[1]?.trim() ?? '';
    const optB = block.match(/B[、.]\s*([\s\S]*?)(?=\s*C[、.]|$)/)?.[1]?.trim() ?? '';
    const optC = block.match(/C[、.]\s*([\s\S]*?)(?=\s*D[、.]|$)/)?.[1]?.trim() ?? '';
    const optD = block.match(/D[、.]\s*([\s\S]*?)(?=$)/)?.[1]?.trim() ?? '';
    const options = [optA, optB, optC, optD];

    // 题目文本：去掉题号和选项部分
    let title = block
      .replace(/^(\d+)[、.]/, '')
      .replace(/[A-D][、.][\s\S]*$/g, '')
      .trim();

    const answer = singleAnswers[number];
    const answerIndex = answer ? answer.ans : 0;

    parsed.push({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`,
      type: 'single',
      text: title,
      options: options,
      answer: answerIndex,
      score: singleScore,
      images: [],
      optionImages: []
    });
  });

  // 提取判断题答案
  const tfAnswers = extractAnswers(tfSection);

  // 按题号分割判断题
  const tfBlocks = tfSection
    .split(/\n(?=\d+[、.])/)
    .filter(block => /^\d+[、.]/.test(block.trim()));

  tfBlocks.forEach((block, idx) => {
    const numberMatch = block.match(/^(\d+)[、.]/);
    if (!numberMatch) return;

    const number = parseInt(numberMatch[1]);
    let title = block
      .replace(/^(\d+)[、.]/, '')
      .trim();

    const answer = tfAnswers[number];
    const answerIndex = answer ? answer.ans : 0;

    parsed.push({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${parsed.length}`,
      type: 'tf',
      text: title,
      options: ['正确', '错误'],
      answer: answerIndex,
      score: tfScore,
      images: [],
      optionImages: []
    });
  });

  return parsed;
};

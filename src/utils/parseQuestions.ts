import type { Question, QuestionType } from '../data';

interface DraftQuestion {
  id: string;
  qNum: number;
  sectionType: QuestionType | 'unknown' | 'ignore';
  text: string;
  options: string[];
  answer: number;
  score: number;
}

interface ParsedAnswer {
  answer: number;
  isTf: boolean;
}

const DEFAULT_SINGLE_OPTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_TF_OPTIONS = ['正确', '错误'];
const ANSWER_WORDS = '(?:参考答案及解析|参考答案|答案解析|答案)';

const QUESTION_RE = /^(?:[（(]?\s*)?(\d{1,3})(?:\s*[）)]|[.．、])\s*(.+)$/;
const OPTION_RE = /^([A-Fa-f])(?:\s*[.．、:：)]|\s+)\s*(.+)$/;
const ANSWER_HEADER_RE = new RegExp(`^${ANSWER_WORDS}[:：\\s]*`);
const INLINE_ANSWER_RE = new RegExp(`${ANSWER_WORDS}[:：\\s]*([A-Fa-f]|对|错|正确|错误|正|误|[xX]|√|✓|✔|×)`);
const NUMBERED_ANSWER_RE = /(?:^|[\s,，、;；])(?:第\s*)?(\d{1,3})(?:\s*题)?\s*[.．、:：)]?\s*([A-Fa-f]|对|错|正确|错误|正|误|[xX]|√|✓|✔|×)(?=$|[\s,，、;；])/g;
const RANGE_ANSWER_RE = /^(\d{1,3})\s*[-~–—]\s*(\d{1,3})\s*[:：]?\s*([A-Fa-f对错正误xX√✓✔×\s,，、]+)/;

const normalizeLine = (line: string) =>
  line
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

const optionIndexFromLetter = (value: string) => value.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

const parseAnswerToken = (raw: string): ParsedAnswer | null => {
  const token = raw.trim();
  if (!token) return null;

  if (/^[A-F]$/i.test(token)) {
    return { answer: optionIndexFromLetter(token), isTf: false };
  }

  if (/^(?:对|正|正确|√|✓|✔)$/i.test(token)) {
    return { answer: 0, isTf: true };
  }

  if (/^(?:错|误|错误|x|×)$/i.test(token)) {
    return { answer: 1, isTf: true };
  }

  return null;
};

const stripInlineAnswer = (text: string) => text.replace(INLINE_ANSWER_RE, '').trim();

const makeQuestionId = (qNum: number, index: number) => `q-${Date.now()}-${index}-${qNum}`;

const classifySection = (line: string): QuestionType | 'ignore' | null => {
  const value = line.replace(/\s+/g, '');
  if (/判断题|判断正误|是非题|对错题/.test(value)) return 'tf';
  if (/选择题|单选题|单项选择|多选题|选择/.test(value)) return 'single';
  if (/填空题|简答题|操作题|编程题|程序题|连线题|问答题|解答题/.test(value)) return 'ignore';
  return null;
};

const appendText = (base: string, next: string) => {
  if (!base) return next;
  if (/^[,.;:!?，。；：！？、）)]/.test(next)) return `${base}${next}`;
  return `${base}\n${next}`;
};

const normalizeOptionText = (option: string, index: number) => {
  const value = option.trim();
  return value || String.fromCharCode(65 + index);
};

const parseAnswerLines = (lines: string[]) => {
  const answers = new Map<number, ParsedAnswer>();
  let inAnswerBlock = false;
  let nextSequentialQuestion = 1;

  const saveSequentialTokens = (value: string) => {
    const tokens = value
      .split(/[\s,，、;；]+/)
      .flatMap(token => (/^[A-F]{2,}$/i.test(token) ? token.split('') : [token]))
      .filter(Boolean);

    tokens.forEach(token => {
      const parsed = parseAnswerToken(token);
      if (parsed) {
        answers.set(nextSequentialQuestion, parsed);
        nextSequentialQuestion += 1;
      }
    });
  };

  for (const rawLine of lines) {
    let line = normalizeLine(rawLine);
    if (!line) continue;

    const header = line.match(ANSWER_HEADER_RE);
    if (header) {
      inAnswerBlock = true;
      line = line.replace(ANSWER_HEADER_RE, '').trim();
      if (!line) continue;
    }

    if (!inAnswerBlock) {
      const inline = line.match(INLINE_ANSWER_RE);
      const question = line.match(QUESTION_RE);
      if (inline && question) {
        const parsed = parseAnswerToken(inline[1]);
        if (parsed) answers.set(Number(question[1]), parsed);
      }
      continue;
    }

    const rangeMatch = line.match(RANGE_ANSWER_RE);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const tokens = rangeMatch[3]
        .split(/[\s,，、]+/)
        .flatMap(token => (/^[A-F]{2,}$/i.test(token) ? token.split('') : [token]))
        .filter(Boolean);

      for (let qNum = start; qNum <= end; qNum += 1) {
        const parsed = tokens[qNum - start] ? parseAnswerToken(tokens[qNum - start]) : null;
        if (parsed) answers.set(qNum, parsed);
      }
      continue;
    }

    let matchedNumbered = false;
    NUMBERED_ANSWER_RE.lastIndex = 0;
    for (const match of line.matchAll(NUMBERED_ANSWER_RE)) {
      const parsed = parseAnswerToken(match[2]);
      if (parsed) {
        answers.set(Number(match[1]), parsed);
        nextSequentialQuestion = Number(match[1]) + 1;
        matchedNumbered = true;
      }
    }

    if (!matchedNumbered) {
      saveSequentialTokens(line);
    }
  }

  return answers;
};

const makeDraft = (
  qNum: number,
  text: string,
  index: number,
  sectionType: QuestionType | 'unknown' | 'ignore',
  inlineAnswer: ParsedAnswer | null,
): DraftQuestion => {
  const inferredType = inlineAnswer?.isTf ? 'tf' : sectionType;
  return {
    id: makeQuestionId(qNum, index),
    qNum,
    sectionType: inferredType,
    text: stripInlineAnswer(text),
    options: inlineAnswer?.isTf ? DEFAULT_TF_OPTIONS : [],
    answer: inlineAnswer ? inlineAnswer.answer : 0,
    score: inferredType === 'tf' ? 4 : 3,
  };
};

const finalizeQuestion = (draft: DraftQuestion, answerFromBlock?: ParsedAnswer): Question | null => {
  const answer = answerFromBlock || null;
  const hasChoiceOptions = draft.options.length >= 2;
  const type: QuestionType | null = answer?.isTf || draft.sectionType === 'tf'
    ? 'tf'
    : (draft.sectionType === 'single' || hasChoiceOptions || (answer && !answer.isTf) ? 'single' : null);

  if (!type || draft.sectionType === 'ignore') return null;

  if (type === 'tf') {
    return {
      id: draft.id,
      type: 'tf',
      text: draft.text.trim(),
      options: DEFAULT_TF_OPTIONS,
      answer: Math.max(0, Math.min(answer?.answer ?? draft.answer, 1)),
      score: 4,
      images: [],
      optionImages: [],
    };
  }

  const options = hasChoiceOptions ? draft.options.map(normalizeOptionText) : DEFAULT_SINGLE_OPTIONS;
  const selected = answer && !answer.isTf ? answer.answer : draft.answer;

  return {
    id: draft.id,
    type: 'single',
    text: draft.text.trim(),
    options,
    answer: Math.max(0, Math.min(selected, options.length - 1)),
    score: 3,
    images: [],
    optionImages: [],
  };
};

const parseLinesToQuestions = (lines: string[]): Question[] => {
  const answersByNumber = parseAnswerLines(lines);
  const questions: Question[] = [];
  let sectionType: QuestionType | 'unknown' | 'ignore' = 'unknown';
  let current: DraftQuestion | null = null;
  let lastOptionIndex = -1;

  const pushCurrent = () => {
    if (!current || !current.text.trim()) return;
    const finalized = finalizeQuestion(current, answersByNumber.get(current.qNum));
    if (finalized) questions.push(finalized);
  };

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) continue;

    // 只有当答案是纯标题行（没有后续内容）时才 break
    if (ANSWER_HEADER_RE.test(line) && line.replace(ANSWER_HEADER_RE, '').trim() === '') {
      pushCurrent(); // 先保存当前题目
      break;
    }

    const nextSection = classifySection(line);
    if (nextSection) {
      pushCurrent();
      current = null;
      lastOptionIndex = -1;
      sectionType = nextSection;
      continue;
    }

    const questionMatch = line.match(QUESTION_RE);
    if (questionMatch && !OPTION_RE.test(line)) {
      pushCurrent();
      const qNum = Number(questionMatch[1]);
      const inlineAnswer = line.match(INLINE_ANSWER_RE);
      const parsedInlineAnswer = inlineAnswer ? parseAnswerToken(inlineAnswer[1]) : null;
      current = makeDraft(qNum, questionMatch[2], questions.length + 1, sectionType, parsedInlineAnswer);
      lastOptionIndex = -1;
      continue;
    }

    if (!current) continue;

    const optionMatch = line.match(OPTION_RE);
    if (optionMatch) {
      const optionIndex = optionIndexFromLetter(optionMatch[1]);
      const optionText = stripInlineAnswer(optionMatch[2]);
      while (current.options.length < optionIndex) current.options.push('');
      current.options[optionIndex] = optionText || optionMatch[1].toUpperCase();
      current.sectionType = current.sectionType === 'ignore' ? 'ignore' : 'single';
      lastOptionIndex = optionIndex;

      const inlineAnswer = line.match(INLINE_ANSWER_RE);
      const parsedInlineAnswer = inlineAnswer ? parseAnswerToken(inlineAnswer[1]) : null;
      if (parsedInlineAnswer) current.answer = parsedInlineAnswer.answer;
      continue;
    }

    const inlineAnswer = line.match(INLINE_ANSWER_RE);
    if (inlineAnswer) {
      const parsed = parseAnswerToken(inlineAnswer[1]);
      if (parsed) {
        current.answer = parsed.answer;
        if (parsed.isTf) current.sectionType = 'tf';
      }
      const remaining = stripInlineAnswer(line);
      if (remaining) current.text = appendText(current.text, remaining);
      continue;
    }

    if (lastOptionIndex >= 0 && current.options[lastOptionIndex] !== undefined) {
      current.options[lastOptionIndex] = `${current.options[lastOptionIndex]} ${line}`.trim();
    } else {
      current.text = appendText(current.text, line);
    }
  }

  pushCurrent();
  return questions;
};

const stitchFragmentedWordText = (lines: string[]) => {
  const result: string[] = [];
  
  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (!normalized) continue;
    
    // 检查是否是选项行（A. xxx B. xxx 格式，同一行有多个选项）
    const optionParts = normalized.split(/\s+(?=[A-Fa-f][.．、:：)])/);
    if (optionParts.length > 1) {
      // 每个选项单独一行
      result.push(...optionParts);
    } else {
      result.push(normalized);
    }
  }
  
  return result;
};

export const parseTextToQuestions = (text: string): Question[] => {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const parsed = parseLinesToQuestions(lines);
  const compactParsed = parseLinesToQuestions(stitchFragmentedWordText(lines));
  return compactParsed.length > parsed.length ? compactParsed : parsed;
};

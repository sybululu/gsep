import type { Question, QuestionType } from '../data';

interface DraftQuestion {
  id: string;
  qNum: number;
  type: QuestionType;
  text: string;
  options: string[];
  answer: number;
  score: number;
  images: string[];
  optionImages: string[];
}

interface ParsedAnswer {
  qNum?: number;
  answer: number;
  isTf: boolean;
}

const DEFAULT_SINGLE_OPTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_TF_OPTIONS = ['Correct', 'Wrong'];

const QUESTION_RE = /^(\d+)(?:[.\u3001]|\s+)\s*(.+)$/;
const OPTION_RE = /^([A-F])(?:[.\u3001:\uff1a]|\s+)\s*(.+)$/i;
const ANSWER_HEADER_RE = /^(?:\u53c2\u8003\u7b54\u6848|\u7b54\u6848|\u7b54\u6848\u89e3\u6790|\u53c2\u8003\u7b54\u6848\u53ca\u89e3\u6790)[:\uff1a\s]*/;
const INLINE_ANSWER_RE = /(?:\u53c2\u8003\u7b54\u6848|\u7b54\u6848)[:\uff1a\s]*([A-Fa-f]|\u5bf9|\u9519|\u6b63\u786e|\u9519\u8bef|\u6b63|\u8bef|[xX]|\u2713|\u2714|\u221a|\u00d7)/;
const RANGE_ANSWER_RE = /^(\d+)\s*[-~\u2013\u2014]\s*(\d+)\s*[:\uff1a]?\s*([A-Fa-f\u5bf9\u9519\u6b63\u8befxX\u2713\u2714\u221a\u00d7\s,\uff0c\u3001]+)/;
const NUMBERED_ANSWER_RE = /^(\d+)\s*[.\u3001:\uff1a)]?\s*([A-Fa-f]|\u5bf9|\u9519|\u6b63\u786e|\u9519\u8bef|\u6b63|\u8bef|[xX]|\u2713|\u2714|\u221a|\u00d7)/;

const normalizeLine = (line: string) =>
  line
    .replace(/\u00a0/g, ' ')
    .replace(/^\s+|\s+$/g, '');

const optionIndexFromLetter = (value: string) =>
  value.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

const parseAnswerToken = (raw: string): ParsedAnswer | null => {
  const token = raw.trim();
  if (!token) return null;

  if (/^[A-F]$/i.test(token)) {
    return { answer: optionIndexFromLetter(token), isTf: false };
  }

  if (/^(?:\u5bf9|\u6b63|\u6b63\u786e|\u2713|\u2714|\u221a)$/i.test(token)) {
    return { answer: 0, isTf: true };
  }

  if (/^(?:\u9519|\u8bef|\u9519\u8bef|x|\u00d7)$/i.test(token)) {
    return { answer: 1, isTf: true };
  }

  return null;
};

const stripInlineAnswer = (text: string) => text.replace(INLINE_ANSWER_RE, '').trim();

const makeQuestionId = (qNum: number, index: number) => `q-${Date.now()}-${index}-${qNum}`;

const applyAnswer = (question: DraftQuestion, answer: ParsedAnswer) => {
  question.answer = Math.max(0, Math.min(answer.answer, question.options.length - 1));
  if (answer.isTf) {
    question.type = 'tf';
    question.options = DEFAULT_TF_OPTIONS;
    question.answer = Math.max(0, Math.min(answer.answer, 1));
    question.score = 4;
  }
};

const finalizeQuestion = (draft: DraftQuestion): Question => {
  const hasOptions = draft.options.length > 0;
  const type: QuestionType = draft.type === 'tf' ? 'tf' : 'single';
  const options = type === 'tf'
    ? DEFAULT_TF_OPTIONS
    : (hasOptions ? draft.options : DEFAULT_SINGLE_OPTIONS);
  const answer = Math.max(0, Math.min(draft.answer, options.length - 1));

  return {
    id: draft.id,
    type,
    text: draft.text.trim(),
    options,
    answer,
    score: draft.score,
    images: draft.images,
    optionImages: draft.optionImages,
  };
};

const parseAnswerLines = (lines: string[]) => {
  const answers = new Map<number, ParsedAnswer>();
  let inAnswerBlock = false;
  let nextSequentialQuestion = 1;

  for (const rawLine of lines) {
    let line = normalizeLine(rawLine);
    if (!line) continue;

    const header = line.match(ANSWER_HEADER_RE);
    if (header) {
      inAnswerBlock = true;
      line = line.replace(ANSWER_HEADER_RE, '').trim();
      if (!line) continue;
    }

    if (!inAnswerBlock && !ANSWER_HEADER_RE.test(rawLine)) continue;

    const rangeMatch = line.match(RANGE_ANSWER_RE);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const tokens = rangeMatch[3]
        .split(/[\s,\uff0c\u3001]+/)
        .flatMap(token => (/^[A-F]+$/i.test(token) ? token.split('') : [token]))
        .filter(Boolean);

      for (let qNum = start; qNum <= end; qNum += 1) {
        const token = tokens[qNum - start];
        const parsed = token ? parseAnswerToken(token) : null;
        if (parsed) answers.set(qNum, { ...parsed, qNum });
      }
      continue;
    }

    const numbered = line.match(NUMBERED_ANSWER_RE);
    if (numbered) {
      const parsed = parseAnswerToken(numbered[2]);
      if (parsed) {
        answers.set(Number(numbered[1]), { ...parsed, qNum: Number(numbered[1]) });
        nextSequentialQuestion = Number(numbered[1]) + 1;
      }
      continue;
    }

    const tokens = line
      .split(/[\s,\uff0c\u3001]+/)
      .flatMap(token => (/^[A-F]+$/i.test(token) ? token.split('') : [token]))
      .filter(Boolean);

    for (const token of tokens) {
      const parsed = parseAnswerToken(token);
      if (parsed) {
        answers.set(nextSequentialQuestion, { ...parsed, qNum: nextSequentialQuestion });
        nextSequentialQuestion += 1;
      }
    }
  }

  return answers;
};

export const parseTextToQuestions = (text: string): Question[] => {
  const lines = text.split(/\r?\n/).map(normalizeLine);
  const answersByNumber = parseAnswerLines(lines);
  const questions: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;

  const pushCurrent = () => {
    if (current && current.text.trim()) {
      const answer = answersByNumber.get(current.qNum);
      if (answer) applyAnswer(current, answer);
      questions.push(current);
    }
  };

  for (const line of lines) {
    if (!line) continue;
    if (ANSWER_HEADER_RE.test(line) && !INLINE_ANSWER_RE.test(line)) break;

    const questionMatch = line.match(QUESTION_RE);
    if (questionMatch && !OPTION_RE.test(line)) {
      pushCurrent();

      const qNum = Number(questionMatch[1]);
      const inlineAnswer = line.match(INLINE_ANSWER_RE);
      const parsedInlineAnswer = inlineAnswer ? parseAnswerToken(inlineAnswer[1]) : null;

      current = {
        id: makeQuestionId(qNum, questions.length + 1),
        qNum,
        type: parsedInlineAnswer?.isTf ? 'tf' : 'single',
        text: stripInlineAnswer(questionMatch[2]),
        options: parsedInlineAnswer?.isTf ? DEFAULT_TF_OPTIONS : [],
        answer: 0,
        score: parsedInlineAnswer?.isTf ? 4 : 3,
        images: [],
        optionImages: [],
      };

      if (parsedInlineAnswer) applyAnswer(current, parsedInlineAnswer);
      continue;
    }

    if (!current) continue;

    const optionMatch = line.match(OPTION_RE);
    if (optionMatch) {
      const optionIndex = optionIndexFromLetter(optionMatch[1]);
      const optionText = stripInlineAnswer(optionMatch[2]);
      while (current.options.length < optionIndex) {
        current.options.push('');
      }
      current.options[optionIndex] = optionText || optionMatch[1].toUpperCase();

      const inlineAnswer = line.match(INLINE_ANSWER_RE);
      const parsedInlineAnswer = inlineAnswer ? parseAnswerToken(inlineAnswer[1]) : null;
      if (parsedInlineAnswer) applyAnswer(current, parsedInlineAnswer);
      continue;
    }

    const inlineAnswer = line.match(INLINE_ANSWER_RE);
    if (inlineAnswer) {
      const parsed = parseAnswerToken(inlineAnswer[1]);
      if (parsed) applyAnswer(current, parsed);
      const remaining = stripInlineAnswer(line);
      if (remaining) current.text = `${current.text}\n${remaining}`;
      continue;
    }

    current.text = `${current.text}\n${line}`;
  }

  pushCurrent();
  return questions.map(finalizeQuestion);
};

import type { Question } from '../components/questionBank/types';

const normalizeLine = (line: string) =>
  line.replace(/\u00a0/g, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// 从章节标题中提取分值，如 "每题 2 分" 或 "每题2分"
const extractScore = (line: string): number | null => {
  const match = line.match(/每题\s*(\d+)\s*[分]?/);
  return match ? parseInt(match[1]) : null;
};

export const parseTextToQuestions = (text: string): Question[] => {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);

  // Prepass: extract all answers
  const allSeqAnswers: { ans: number; isTf: boolean }[] = [];
  const globalAnswers: { qNum: number; ans: number; isTf: boolean }[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    // 表格格式：题号 1 2 3... 和 答案 A B C... 分两行
    if (/^题号/.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const ansLineMatch = nextLine.match(/^答案[\t\s]*([A-F对错√×\s]+)/i);
      if (ansLineMatch) {
        let str = ansLineMatch[1].replace(/\t/g, ' ').trim();
        let ansList: string[] = /\s/.test(str) ? str.split(/\s+/) : str.split('');
        
        // 尝试从题号行提取数字
        const numMatch = line.match(/[\d]+/g);
        
        for (let j = ansList.length - 1; j >= 0; j--) {
          const aStr = ansList[j].trim().toUpperCase();
          if (!aStr || aStr === '答案') continue;
          const isTf = aStr === '对' || aStr === '√' || aStr === '错' || aStr === '×';
          const aCode = (aStr === '对' || aStr === '√') ? 0 : ((aStr === '错' || aStr === '×') ? 1 : aStr.charCodeAt(0) - 65);
          
          if (numMatch && numMatch[j]) {
            globalAnswers.push({ qNum: parseInt(numMatch[j]), ans: aCode, isTf });
          } else {
            allSeqAnswers.push({ ans: aCode, isTf });
          }
        }
        lines[i] = '';
        lines[i + 1] = '';
        continue;
      }
    }

    // Pure answer format: 答案：B A B A 或 答案：√ √ ×
    const pureAnsMatch = line.match(/^(?:参考答案|答案)[：:\s]*([A-F对错√×\s]{2,})$/i);
    if (pureAnsMatch) {
      let str = pureAnsMatch[1].trim();
      let ansList: string[] = /\s/.test(str) ? str.split(/\s+/) : str.split('');
      
      for (let j = ansList.length - 1; j >= 0; j--) {
        const aStr = ansList[j].trim().toUpperCase();
        if (!aStr) continue;
        const isTf = aStr === '对' || aStr === '√' || aStr === '错' || aStr === '×';
        const aCode = (aStr === '对' || aStr === '√') ? 0 : ((aStr === '错' || aStr === '×') ? 1 : aStr.charCodeAt(0) - 65);
        allSeqAnswers.push({ ans: aCode, isTf });
      }
      lines[i] = '';
    }
  }

  // 逆序排列答案，恢复原始顺序
  allSeqAnswers.reverse();
  
  // 分类答案：判断题在前，单选题在后
  const tfAnswers = allSeqAnswers.filter(a => a.isTf);
  const singleAnswers = allSeqAnswers.filter(a => !a.isTf);
  
  let singleIdx = 0;
  let tfIdx = 0;

  const filteredLines = lines.filter(Boolean);
  const parsed: Question[] = [];
  let currentQ: any = null;
  let currentOptions: string[] = [];
  
  // 只在单选题或判断题区域内才识别题目
  let inSingleSection = false;
  let inTfSection = false;
  
  // 当前章节的分值
  let currentSingleScore = 2;
  let currentTfScore = 4;

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];

    // Section detection - 只识别一、二章节的题目
    if (/^一/.test(line) && /单选/.test(line)) {
      inSingleSection = true;
      inTfSection = false;
      const score = extractScore(line);
      if (score !== null) currentSingleScore = score;
      continue;
    }
    if (/^二/.test(line) && /判断/.test(line)) {
      inSingleSection = false;
      inTfSection = true;
      const score = extractScore(line);
      if (score !== null) currentTfScore = score;
      continue;
    }
    // 遇到其他章节标题，重置状态
    if (/^[三四五六七八九十]+[、.]/.test(line) && !inSingleSection && !inTfSection) {
      continue;
    }
    if (/^[三四五六七八九十]、/.test(line)) {
      inSingleSection = false;
      inTfSection = false;
      continue;
    }

    // 如果不在单选题或判断题区域，跳过
    if (!inSingleSection && !inTfSection) continue;

    // Match question line
    const qMatch = line.match(/^[\(（\[【]?(\d+)[\)）\]】]?[\.、:：]\s*(.*)/);
    if (qMatch) {
      if (currentQ) {
        if (currentQ.type === 'tf') {
          // 判断题强制使用正确/错误选项
          currentQ.options = ['正确', '错误'];
        } else if (currentOptions.length > 0 && currentOptions.some(opt => opt.trim())) {
          // 有有效文字选项，使用解析到的选项
          currentQ.options = currentOptions;
        } else {
          // 选项为空或无文字，预留 A/B/C/D 空白选项（用于图片选项）
          currentQ.options = ['A', 'B', 'C', 'D'];
        }
        parsed.push(currentQ as Question);
      }
      
      currentQ = {
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`,
        type: inTfSection ? 'tf' : 'single',
        text: qMatch[2],
        options: [],
        answer: 0,
        score: inTfSection ? currentTfScore : currentSingleScore,
        images: [],
        optionImages: [],
        qNum: parseInt(qMatch[1])
      };
      currentOptions = [];
      continue;
    }

    if (!currentQ) continue;

    // Option lines
    if (/^[A-F]([\.、:：]|\s+)/.test(line) && currentOptions.length < 10) {
      const parts = line.split(/(?:\s+)?(?=[A-F](?:[\.、:：]|\s+))/).map(s => s.trim()).filter(s => /^[A-F](?:[\.、:：]|\s+)?/.test(s));
      parts.forEach(part => {
        const optMatch = part.match(/^[A-F](?:[\.、:：]|\s+)?\s*(.*)/);
        if (optMatch) currentOptions.push(optMatch[1].trim());
      });
      continue;
    }

    // Continuation
    if (!line.startsWith('答案') && !line.startsWith('参考答案')) {
      currentQ.text += '\n' + line;
    }
  }

  if (currentQ) {
    if (currentQ.type === 'tf') {
      // 判断题强制使用正确/错误选项
      currentQ.options = ['正确', '错误'];
    } else if (currentOptions.length > 0 && currentOptions.some(opt => opt.trim())) {
      // 有有效文字选项，使用解析到的选项
      currentQ.options = currentOptions;
    } else {
      // 选项为空或无文字，预留 A/B/C/D 空白选项（用于图片选项）
      currentQ.options = ['A', 'B', 'C', 'D'];
    }
    parsed.push(currentQ as Question);
  }

  // Apply answers based on type
  parsed.forEach((q, idx) => {
    let matchedAns;
    
    // 优先使用按题号匹配的答案（表格格式）
    const qNumMatch = (q as any).qNum;
    if (qNumMatch !== undefined) {
      const pAns = globalAnswers.find(ga => ga.qNum === qNumMatch);
      if (pAns) matchedAns = pAns;
    }
    
    // 其次使用按顺序的答案
    if (!matchedAns) {
      if (q.type === 'tf' && tfIdx < tfAnswers.length) {
        matchedAns = tfAnswers[tfIdx++];
      } else if (q.type === 'single' && singleIdx < singleAnswers.length) {
        matchedAns = singleAnswers[singleIdx++];
      }
    }
    
    if (matchedAns) {
      q.answer = matchedAns.ans;
      if (matchedAns.isTf) {
        q.type = 'tf';
        q.options = ['正确', '错误'];
      } else if (q.type === 'tf') {
        q.type = 'single';
        q.options = ['A', 'B', 'C', 'D'];
      }
    }
    
    if (q.answer === undefined || isNaN(q.answer) || q.answer < 0 || q.answer >= (q.options?.length || 1)) {
      q.answer = 0;
    }
    delete (q as any).qNum;
  });

  return parsed;
};

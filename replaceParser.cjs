const fs = require('fs');
let c = fs.readFileSync('src/components/ImageMatcher.tsx', 'utf8');

const targetFunction = /const parseTextToQuestions = \(text: string\): Question\[\] => \{[\s\S]*?(?=const handleDownloadApplet =)/;

const newFunction = \`const parseTextToQuestions = (text: string): Question[] => {
    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
    const parsed: Question[] = [];
    let currentQ: Partial<Question> | null = null;
    let currentOptions: string[] = [];
    const globalAnswers: { qNum?: number, ans: number, isTf?: boolean }[] = [];
    const seqAnswers: { ans: number, isTf?: boolean }[] = [];

    // Prepass to consume all unified answers at the bottom of the list
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let isAnswerLine = false;

        const rangeMatch = line.match(/^(\\d+)[-~](\\d+)[\\.、:：\\s]*([A-F对错√×\\s]+)$/i);
        if (rangeMatch) {
            const s = parseInt(rangeMatch[1]);
            const e = parseInt(rangeMatch[2]);
            const ansStr = rangeMatch[3].replace(/\\s+/g, '').toUpperCase();
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

        if (!isAnswerLine && /^[\\d\\.、:：\\sA-F对错√×]+$/i.test(line)) {
            const inlineAnsRegex = /(\\d+)[\\.、:：\\s]*([A-F对错√×])/gi;
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
            const pureAnsMatch = line.match(/^(?:参考答案|答案|答案解析|参考答案及解析)?[：:\\s]*([A-F对错√×\\s]{2,})$/i);
            if (pureAnsMatch) {
                let str = pureAnsMatch[1].trim();
                let ansList = [];
                if (/\\s/.test(str)) {
                     ansList = str.split(/\\s+/).filter(Boolean);
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

        if (!isAnswerLine && /^(?:参考答案|答案|答案解析|参考答案及解析)[：:\\s]*$/.test(line)) {
            isAnswerLine = true;
        }

        if (isAnswerLine) {
            lines[i] = '';
        }
    }

    const filteredLines = lines.filter(Boolean);
    
    for (let i = 0; i < filteredLines.length; i++) {
        const line = filteredLines[i];

        const qMatch = line.match(/^(\\d+)[\\.、]?\\s+(.*)/) || line.match(/^(\\d+)[\\.、]\\s*(.*)/);
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
            };
            currentOptions = [];
            continue;
        }

        if (!currentQ) continue;

        const ansMatch = line.match(/^答案[：:\\s]*([A-Z对错√×])/i);
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

        if (/^[A-F]([\\.、:：]|\\s+)/.test(line) && currentQ && currentOptions.length < 10) {
            const parts = line.split(/(?:\\s+)?(?=[A-F](?:[\\.、:：]|\\s+))/).map(s => s.trim()).filter(s => /^[A-F](?:[\\.、:：]|\\s+)?/.test(s));
            if (parts.length > 0) {
                parts.forEach(part => {
                    const optMatch = part.match(/^[A-F](?:[\\.、:：]|\\s+)?\\s*(.*)/);
                    if (optMatch) currentOptions.push(optMatch[1].trim());
                });
                continue;
            }
        }

        if (!line.startsWith('答案')) {
            currentQ.text += '\\n' + line;
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
             }
        }
        
        if (q.answer === undefined || isNaN(q.answer) || q.answer < 0 || q.answer >= (q.options?.length || 1)) {
            q.answer = 0;
        }
        delete (q as any).qNum;
    });

    return parsed;
};
`;

c = c.replace(targetFunction, newFunction);
fs.writeFileSync('src/components/ImageMatcher.tsx', c);

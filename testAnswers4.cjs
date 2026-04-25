const text = `
1. Apple is?
A. a B. b
2. Banana is?
A. a B. b
3. Orange is?
A. a B. b
答案:
1.A 2.B 3.C
`;

const parseTextToQuestions = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    let currentQ = null;
    let currentOptions = [];
    const globalAnswers = [];
    const seqAnswers = [];

    let inGlobalAnswerSection = true;

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
                    let aCode = ansStr[j] === '对' || ansStr[j] === '√' ? 0 : (ansStr[j] === '错' || ansStr[j] === '×' ? 1 : ansStr[j].charCodeAt(0) - 65);
                    globalAnswers.push({qNum: s+j, ans: aCode});
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
                      let aCode = aStr === '对' || aStr === '√' ? 0 : (aStr === '错' || aStr === '×' ? 1 : aStr.charCodeAt(0) - 65);
                      globalAnswers.push({qNum: parseInt(m[1]), ans: aCode});
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
                     let aCode = aStr === '对' || aStr === '√' ? 0 : (aStr === '错' || aStr === '×' ? 1 : aStr.charCodeAt(0) - 65);
                     currentLineAnswers.push(aCode);
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
        } else {
            // Once we hit a non-answer line, if it looks like a question or option, we might choose to stop.
            // But strict matching means it's safe to run over the whole text. 
            // So we don't break.
        }
    }

    const filteredLines = lines.filter(Boolean);
    let qIndex = 0;
    
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
                parsed.push(currentQ);
                qIndex++;
            }
            currentQ = {
                id: 'q-' + parseInt(qMatch[1]),
                qNum: parseInt(qMatch[1]),
                type: 'single',
                text: qMatch[2],
                options: [],
                answer: 0,
            };
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
        parsed.push(currentQ);
    }
    
    parsed.forEach((q, idx) => {
        const pAns = globalAnswers.find(ga => ga.qNum === q.qNum);
        if (pAns) {
            q.answer = pAns.ans;
        } else if (seqAnswers.length > idx) {
            q.answer = seqAnswers[idx];
        }

        if (q.answer === 0 || q.answer === 1) {
             if (q.options && q.options.length <= 2 && !q.options.includes('正确')) {
                q.type = 'tf';
                q.options = ['正确', '错误'];
             }
        }
        
        if (q.answer === undefined || isNaN(q.answer) || q.answer < 0 || q.answer >= (q.options?.length || 1)) {
            q.answer = 0;
        }
    });

    return parsed;
};
const text2 = "1. a\n2. b\n参考答案 1. A 2. B"
console.log(JSON.stringify(parseTextToQuestions(text), null, 2));
console.log(JSON.stringify(parseTextToQuestions(text2), null, 2));

const text3 = `
1. Apple is?
A. a B. b
2. Banana is?
A. a B. b
3. Orange is?
A. a B. b
1-3: ABC
`
console.log("TEXT3");
console.log(JSON.stringify(parseTextToQuestions(text3), null, 2));

const text4 = `
1. Apple is?
A. a B. b
2. Banana is?
A. a B. b
3. Orange is?
A. a B. b
答案
A B C
`
console.log("TEXT4");
console.log(JSON.stringify(parseTextToQuestions(text4), null, 2));

const text5 = `
1. A.苹果
A. a B. b
2. 题目
A. a B. b
答案
1.B 2.B
`;
console.log("TEXT5");
console.log(JSON.stringify(parseTextToQuestions(text5), null, 2));

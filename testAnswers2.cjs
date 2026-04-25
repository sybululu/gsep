function extractGlobalAnswers(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const answers = [];
    
    // Attempt 1: look for a clear answer section
    let answerSection = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (/^(参考答案|答案|答案解析|参考答案及解析)[：:\s]*$/.test(lines[i])) {
            answerSection = i;
            break;
        }
    }
    
    const parseAnswersFromLine = (line) => {
        const results = [];
        // Match 1.A, 1. A, 1、A, 1 A
        const regex1 = /(\d+)[\.、:：\s]*([A-F对错√×])/g;
        let m;
        while ((m = regex1.exec(line)) !== null) {
            results.push({ qNum: parseInt(m[1]), ans: m[2] });
        }
        
        // Match 1-5: ABCDE, 1~5 ABCDE
        const regex2 = /(\d+)[-~](\d+)[\.、:：\s]*([A-F对错√×\s]+)/g;
        while ((m = regex2.exec(line)) !== null) {
            const start = parseInt(m[1]);
            const end = parseInt(m[2]);
            const ansStr = m[3].replace(/\s+/g, '');
            if (end - start + 1 === ansStr.length) {
                 for (let i = 0; i < ansStr.length; i++) {
                     results.push({ qNum: start + i, ans: ansStr[i] });
                 }
            }
        }
        
        // Match standard space-separated A B C D (if it's in answer section)
        if (results.length === 0 && line.match(/^[\sA-F对错√×]+$/)) {
             const letters = line.split(/\s+/).filter(Boolean);
             letters.forEach((l, idx) => {
                 results.push({ qNum: -1, ans: l }); // -1 means sequential
             });
        }
        
        return results;
    };
    
    let extracted = [];
    if (answerSection !== -1) {
        for (let i = answerSection; i < lines.length; i++) {
            extracted.push(...parseAnswersFromLine(lines[i]));
            lines[i] = '';
        }
    } else {
        for (let i = lines.length - 1; i >= 0; i--) {
             // Only scan bottom-up until we see non-answer lines
             let lineAnswers = parseAnswersFromLine(lines[i]);
             if (lineAnswers.length > 0) {
                 extracted.unshift(...lineAnswers);
                 lines[i] = '';
             } else {
                 if (lines[i] === '' || /^参考答案|答案[：:\s]*$/.test(lines[i])) {
                     lines[i] = '';
                 } else {
                     break;
                 }
             }
        }
    }
    
    return { extracted, remainingLines: lines.filter(Boolean) };
}

const tests = [
"1. 题目1\nA. a B. b\n2. 题目2\nA. a B. b\n3. 题目3\nA. a B. b\n答案\n1-3: ABC",
"1. 题目1\nA. a B. b\n2. 题目2\nA. a B. b\n3. 题目3\nA. a B. b\n答案：\n1. A 2. B 3. C",
"1. 题目1\nA. a B. b\n2. 题目2\nA. a B. b\n3. 题目3\nA. a B. b\n参考答案：1.A 2.B 3.C",
"1. 题目1\nA. a B. b\n1-3:A C D\n2. 题目2\nA. a B. b\n3. 题目3\nA. a B. b\n1-3:A B C\n4~5: D E",
"1. 题目1\n2. 题目2\n答案 A B"
];

tests.forEach((t, i) => {
    console.log("TEST " + i);
    console.log(extractGlobalAnswers(t));
});

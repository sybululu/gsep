function extractGlobalAnswers(text) {
    // Look for a section that looks like answers.
    // Try to find "参考答案", "答案" section at the bottom.
    
    // We can also just run a regex to find all answer declarations:
    // "1. A", "1.A", "1-5: ABCDE", "1~5 ABCDE"
    
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
        const regex2 = /(\d+)[-~](\d+)[\.、:：\s]*([A-F对错√×]+)/g;
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
        // If it's pure letters in the answer section: "A B C D A B C D"
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
            // Clear these lines so they don't break questions parsing
            lines[i] = '';
        }
    } else {
        // Just try to find answers at the end of the text if they have numbers
        // Go from bottom up until we hit something that doesn't look like answers at all
        for (let i = lines.length - 1; i >= 0; i--) {
             let lineAnswers = parseAnswersFromLine(lines[i]);
             if (lineAnswers.length > 0) {
                 extracted.unshift(...lineAnswers);
                 lines[i] = '';
             } else {
                 // Check if line is empty or just says "答案"
                 if (lines[i] === '' || /^答案[：:\s]*$/.test(lines[i])) {
                     lines[i] = '';
                 } else {
                     break; // Stop going up
                 }
             }
        }
    }
    
    return { extracted, remainingLines: lines.filter(Boolean) };
}

const tests = [
\`1. 题目1
A. a B. b
2. 题目2
A. a B. b
3. 题目3
A. a B. b
答案
1-3: ABC\`,

\`1. 题目1
A. a B. b
2. 题目2
A. a B. b
3. 题目3
A. a B. b
答案：
1. A 2. B 3. C\`,

\`1. 题目1
A. a B. b
2. 题目2
A. a B. b
3. 题目3
A. a B. b
参考答案：1.A 2.B 3.C
\`,

\`1. 题目1
A. a B. b
2. 题目2
A. a B. b
3. 题目3
A. a B. b
1-3:A B C
4~5: D E\`
];

tests.forEach((t, i) => {
    console.log("TEST " + i);
    console.log(extractGlobalAnswers(t));
});

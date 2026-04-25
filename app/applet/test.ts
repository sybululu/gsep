import * as fs from 'fs';

const text = `
1、在 2026 年春晚的《武 BOT》节目中，一群机器人表演空翻：它们落地后晃一下又能站稳，还会移动保持队形整齐。如果把机器人看成一台计算机，它的“输入设备”就像耳朵、眼睛，用来从外面接收信息。那么，下面哪一个选项不能当作机器人的“输入设备”？（ ）
A、检测身体是否歪斜的“平衡传感器”（像感觉站得稳不稳的小秤）
B、机器人内部安装好的“智能程序”（像它的大脑，用来思考和控制动作）C、用来接收人类指令的“遥控器”
D、机器人的“摄像头眼睛”（用来拍下其他机器人的位置）

2、下面的积木块在哪个模块当中？（ ）
A、侦测B、事件
C、外观D、运动
`;

const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
let currentQ: any = null;
let currentOptions: string[] = [];
let parsed = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log("LINE:", line);
    
    const qMatch = line.match(/^(\\d+)[\\.、]?\\s+(.*)/) || line.match(/^(\\d+)[\\.、]\\s*(.*)/);
    if (qMatch) {
       console.log("MATCHED Q:", qMatch[1]);
       if (currentQ && (currentOptions.length > 0 || currentQ.type === 'tf')) {
           currentQ.options = currentOptions;
           parsed.push(currentQ);
       }
       currentQ = { id: qMatch[1], text: qMatch[2], options: [] };
       currentOptions = [];
       continue;
    }
    
    const optMatch = line.match(/^[A-F][\\.、]\\s*(.*)/);
    if (optMatch) {
       console.log("MATCHED OPT:", optMatch[1].substring(0, 5));
       currentOptions.push(optMatch[1]);
    }
}
if (currentQ) {
    currentQ.options = currentOptions;
    parsed.push(currentQ);
}

console.log("PARSED:", parsed);

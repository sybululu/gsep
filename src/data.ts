export type QuestionType = 'single' | 'tf';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  answer: number;
  score: number;
  imageFallbackText?: string;
  images?: string[]; // 题干配图，支持多个图片路径
  optionImages?: string[]; // 选项配图，支持多个图片路径，如 ABCD
}

export interface QuizVersion {
  id: string;
  name: string;
  questions: Question[];
}

export const quizVersions: QuizVersion[] = [
  {
    id: 'gesp-2026-spring-1',
    name: 'GESP图形化编程一级-2026春',
    questions: [
      {
        id: 'q1',
        type: 'single',
        text: '1、在 2026 年春晚的《武 BOT》节目中，一群机器人表演空翻：它们落地后晃一下又能站稳，还会移动保持队形整齐。如果把机器人看成一台计算机，它的“输入设备”就像耳朵、眼睛，用来从外面接收信息。那么，下面哪一个选项不能当作机器人的“输入设备”？（ ）',
        options: [
          'A、检测身体是否歪斜的“平衡传感器”（像感觉站得稳不稳的小秤）',
          'B、机器人内部安装好的“智能程序”（像它的大脑，用来思考和控制动作）',
          'C、用来接收人类指令的“遥控器”',
          'D、机器人的“摄像头眼睛”（用来拍下其他机器人的位置）'
        ],
        answer: 1,
        score: 3,
        images: [] 
      },
      {
        id: 'q2',
        type: 'single',
        text: '2、下面的积木块在哪个模块当中？（ ）',
        options: ['A、侦测', 'B、事件', 'C、外观', 'D、运动'],
        answer: 0,
        score: 3,
        imageFallbackText: '积木块内容可能为：[碰到 (鼠标指针) ?]',
        images: ['8b683377-8ad7-4091-a741-b40d63e60332.png']
      },
      {
        id: 'q3',
        type: 'single',
        text: '3、下图为造型编辑界面，以下哪个选项可以实现让小猫造型倒立的功能？（ ）',
        options: ['A、左右翻转', 'B、上下翻转', 'C、填充颜色', 'D、橡皮擦'],
        answer: 1,
        score: 3,
        imageFallbackText: '提示：A选项图标为左右三角，B选项图标为上下三角，C选项为油漆桶，D选项为橡皮擦。',
        images: ['a1ee8240-4bb5-47ee-bd62-02670f5b5b2b.png'],
        optionImages: ['c064c5aa-8bdd-4989-940a-dce85ba3dc35.png', 'df53b41b-dd87-40cc-b6cc-e0846be344b2.png', 'fe7da822-77de-4922-af1b-aac6ef810904.png']
      },
      {
        id: 'q4',
        type: 'single',
        text: '4、如下图，公鸡有 3 个造型，以下哪组积木可以让公鸡最终展示的是 rooster-b？（ ）',
        options: ['A', 'B', 'C', 'D'],
        answer: 0,
        score: 3,
        imageFallbackText: '公鸡有三个造型：rooster-a, rooster-b, rooster-c',
        images: ['7422e0a6-7cd1-4702-ab03-df19877dab70.png'],
        optionImages: ['b1b18793-b5fd-4376-8476-478155fb0ada.png', 'd70b0ee6-30b0-40d9-b973-9d1c7a0151b4.png', 'd8226baf-2fce-4559-9b1b-7ea907297e79.png', 'fcf0662e-5518-47f1-b5fa-f14345eb435a.png']
      },
      {
        id: 'q5',
        type: 'single',
        text: '5、默认小猫角色，下列哪个选项的积木运行后，音量可调整为 80？（ ）',
        options: ['A', 'B', 'C', 'D'],
        answer: 3,
        score: 3,
        imageFallbackText: 'A: 将音量设为100%，将音调增量设为-20。 B: 设为100%，音效设为20。C: 设为100%，又设为-20%。D: 将音量设为100%，将音量增加-20。',
        images: [],
        optionImages: ['2b3af826-8c47-4f63-b65c-f000ce7547d8.png', '7a6e99fa-2ca0-482b-be1e-d8d36b8370d0.png', 'd3cd4a7a-3050-4d6e-9104-bce8f4f5565a.png', 'ea4b17f9-e15c-4625-890c-184c7d851c06.png']
      },
      {
        id: 'q6',
        type: 'single',
        text: '6、点击“绿旗”执行下列程序后，点击小猫几次，小猫会出现在下图位置？（ ）',
        options: ['A、3', 'B、4', 'C、1', 'D、2'],
        answer: 3,
        score: 3,
        imageFallbackText: '初始位置(-80, 80)面向90度。当角色被点击：移动160步，右转90度。图示目标位置在右下角(80,-80)。需要点击2次。',
        images: ['0401f5f5-ae0d-4bd5-a594-20986816f754.png', '8c1004e6-c260-4b8b-abe6-826744bf41b3.png']
      },
      {
        id: 'q7',
        type: 'single',
        text: '7、舞台如下图所示，执行下面程序，小猫最终的大小和碰到的角色是？（ ）',
        options: ['A、100，Block-D', 'B、110，Block-D', 'C、110，Block-A', 'D、100，Block-A'],
        answer: 2,
        score: 3,
        imageFallbackText: '结合条件判断积木和执行顺序来判断小猫最终的位置和大小。',
        images: ['40c9803c-35eb-4282-a388-00a83bf6ac88.png', '4dc2d7bb-212e-44fb-93df-d34822fd08c9.png', '7269f465-4dfa-403b-896a-661f5a38adb5.png']
      },
      {
        id: 'q8',
        type: 'single',
        text: '8、默认小猫角色，执行下列程序后，小猫的坐标是？（ ）',
        options: ['A、（80，50）', 'B、（-120，80）', 'C、（-100，50）', 'D、（80，80）'],
        answer: 1,
        score: 3,
        imageFallbackText: '移到(30,30)，面向-90度。重复5次：移动20步，x坐标增加-10，y坐标增加10。',
        images: ['bd5d5ec5-82c4-4123-a008-fead239d7d86.png']
      },
      {
        id: 'q9',
        type: 'single',
        text: '9、默认小猫角色，执行下列程序后，小猫面向的方向为 270°，那么下图中缺少的积木块是？（ ）',
        options: ['A、碰到鼠标指针', 'B、碰到颜色', 'C、碰到舞台边缘', 'D、颜色碰到颜色'],
        answer: 2,
        score: 3,
        imageFallbackText: '面向90度。重复执行：[移动10步，如果碰到了某物体就反弹]。由于方向最终变成270度(-90度)，说明碰到了边缘反弹。',
        images: ['6e306324-6246-4f2a-bcf5-fc12711f5323.png', '6db3d042-b5df-402f-a3f1-1abf322d5cd9.png'],
        optionImages: ['0f4c5edd-24ad-46db-ac17-42c961f7fc80.png', '205e8eba-ba07-4a40-abcb-7ef83f6abef8.png', '51b77b2a-99ca-41ab-b784-f7c99d5df551.png', 'f1520de1-d11b-4593-b6dd-6bb342db1a7e.png']
      },
      {
        id: 'q10',
        type: 'single',
        text: '10、给地球进行编程，想要实现碰到鼠标指针顺时针转动，否则逆时针转动的效果，下边程序缺少哪个积木块？（ ）',
        options: ['A、将旋转方式设为左右翻转', 'B、重复执行', 'C、将漩涡特效增加25', 'D、重复执行直到碰到鼠标指针'],
        answer: 1,
        score: 3,
        imageFallbackText: '循环检测条件，不断执行顺时针或逆时针旋转。',
        images: ['cb8e046d-e9d8-4098-8a24-c46cacb2e721.png', 'f43fff35-c6b9-43cb-96bf-ac645fceaeee.png'],
        optionImages: ['2af09c66-4fa5-4a3e-9a87-fa5a915140a1.png', '68b1465c-6da1-4e4b-8068-7d8ea68398e6.png', '874441ed-958c-43df-a796-2687ff4210cd.png', '8d5da085-05c3-40c6-9665-7c91704898c7.png']
      },
      {
        id: 'tf1',
        type: 'tf',
        text: '1、在 Scratch 中，位于程序编辑器顶部导航栏的“地球”图标，能够改变积木的显示语言，例如可以将中文切换为英文。',
        options: ['A、正确', 'B、错误'],
        answer: 0,
        score: 4,
        imageFallbackText: '顶部导航栏的地球图标功能。',
        images: ['f756fef5-05fa-42e0-9632-4117e89f819c.png']
      },
      {
        id: 'tf2',
        type: 'tf',
        text: '2、点击“绿旗”运行小猫和大象的程序，三秒钟后，舞台上能够看到下图的样子。',
        options: ['A、正确', 'B、错误'],
        answer: 0,
        score: 4,
        imageFallbackText: '小猫程序：左翻转，面向-90度，说你好。大象：说你好2秒。3秒后进行判断。',
        images: ['440069c0-0d86-4d0f-b486-a6449ef99928.png', '6c266992-68e0-4976-b2cb-6e8d3c5e89bf.png', 'e99cc055-96d8-48cd-800e-4213eefa292a.png']
      },
      {
        id: 'tf3',
        type: 'tf',
        text: '3、同学们排队做操，从前面数小军是第 10 个，从后面数小华是第 8 个，已知小军在小华前面，并且他们之间还有 3 个人。这一排一共有 20 人。',
        options: ['A、正确', 'B、错误'],
        answer: 1,
        score: 4,
        imageFallbackText: '这是一道计算题，人数：10 + 3 + 8 = 21人?',
        images: [] 
      },
      {
        id: 'tf4',
        type: 'tf',
        text: '4、舞台如下图所示，执行下列程序后，小螃蟹说了两次“你好!”。',
        options: ['A、正确', 'B、错误'],
        answer: 1,
        score: 4,
        imageFallbackText: '如果 颜色碰撞 那么说你好2秒。',
        images: ['54833efb-02f8-47ab-bce7-4d77aa728b73.png', 'a2c84c7d-9ea6-471c-a7ec-15e47f3ac1f6.png']
      },
      {
        id: 'tf5',
        type: 'tf',
        text: '5、默认小猫角色，执行下列程序，小猫在舞台上最终是下图的样子。',
        options: ['A、正确', 'B、错误'],
        answer: 1,
        score: 4,
        imageFallbackText: '多角色代码：A等0.2秒移到最前面，C等0.1秒移到最前面，T等0.3秒移到最前面。小猫等0.4秒前移1层。需判断遮挡关系。',
        images: ['655ea716-0de0-44f5-b652-a848e14bf77d.png', '720b328c-c1f1-486e-b89e-3fa0d4d0b990.png', 'a5556a90-f9fb-4977-a827-a693d7156989.png', 'b843c618-2732-4fc9-9e8f-d12a4b42eab2.png']
      }
    ]
  }
];

export const questions: Question[] = quizVersions[0].questions;

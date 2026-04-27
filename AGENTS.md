## 项目概述
GESP Quiz Practice - 基于 Vite + React 的在线编程题库练习平台，支持 GESP 等级考试题目管理、在线答题和 Firebase 云端同步。

## 技术栈
- **框架**：Vite 6 + React 19 + TypeScript
- **样式**：Tailwind CSS 4
- **云服务**：Firebase Firestore（题目库存储）
- **包管理器**：pnpm
- **代码规范**：ESLint

## 目录结构
```
/workspace/projects/
├── src/              # React 源码
├── public/           # 静态资源
├── app/              # 应用配置
├── docs/             # 文档
├── skills/           # 项目技能
├── home/             # 首页相关
├── dist/             # 构建产物
├── scripts/          # 脚本目录
│   ├── coze-preview-build.sh  # 预览构建（dev）
│   ├── coze-preview-run.sh    # 预览运行（dev）
│   ├── build.sh               # 部署构建
│   └── run.sh                 # 部署运行
└── package.json
```

## 关键入口 / 核心模块
- **入口文件**：`index.html`
- **开发命令**：`pnpm run dev`（端口 3000）
- **构建命令**：`pnpm run build`
- **预览命令**：`pnpm run preview`
- **lint 检查**：`pnpm run lint`

## 运行与预览
- **预览服务端口**：5000（平台固定）
- **预览链路**：`scripts/coze-preview-build.sh` → `scripts/coze-preview-run.sh`
- **部署链路**：`scripts/build.sh` → `scripts/run.sh`（使用 `npx serve dist`）

## Coze 配置
- **project_type**：`web`
- **preview_enable**：`enabled`
- **runtime**：nodejs-24
- **deploy.kind**：service
- **deploy.flavor**：web
- **deploy.port**：5000

## 用户偏好与长期约束
1. Node.js 项目统一使用 pnpm，禁止 npm/yarn
2. 预览和部署服务端口固定为 5000
3. 脚本必须基于自身位置定位项目目录，不依赖调用者 pwd
4. Firebase 配置通过 `firebase-applet-config.json` 加载
5. 本地管理员密码：`5834`

## 常见问题和预防
1. **端口冲突**：预览/部署启动前自动清理 5000 端口残留进程
2. **HMR 闪烁**：Vite 配置中 `DISABLE_HMR` 环境变量控制 HMR 行为
3. **依赖安装**：使用 `pnpm install --prefer-frozen-lockfile` 保证一致性
4. **构建产物**：输出到 `dist/` 目录，部署时由 `serve` 提供静态服务

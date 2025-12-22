# ZetaYield

面向多链 DeFi 的 AI 策略生成与执行原型，结合 Qwen（DashScope）意图解析、ZetaChain 多链能力、以及前端可视化监控，提供从“自然语言需求”到“策略生成/准备/执行”的完整流程。

## 功能概览

- AI 意图解析与策略生成（支持 fallback 解析器）
- 资产与协议数据聚合（当前以 mock 数据为主）
- 策略执行流程（执行与跟踪接口，当前为 mock）
- Socket.io 实时推送策略与执行结果
- SQLite 记录交易与策略相关信息
- 前端仪表盘、聊天界面、策略预览与监控面板

## 技术栈

- 后端：Node.js, Express, Socket.io, SQLite, LangChain, DashScope(Qwen), ZetaChain Toolkit
- 前端：Vite, React, TypeScript, Tailwind CSS, shadcn-ui, Zustand, React Query

## 快速开始

### 1) 安装依赖

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`，按需修改：

```env
PORT=3000
DASHSCOPE_API_KEY=sk-your-api-key-here
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

说明：
- 不配置 `DASHSCOPE_API_KEY` 时，会使用 fallback 解析器（功能有限但可运行）。
- 若需国内端点，可设置 `DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`。

### 3) 启动服务

```bash
# 后端
cd backend
npm run dev

# 前端（新终端）
cd frontend
npm run dev
```

默认访问：
- 前端：`http://localhost:8080`
- 后端：`http://localhost:3000`

## 常用脚本

后端：
- `npm run dev` 启动开发服务
- `./test-api.sh` 快速验证 API
- `./test-ai-connection.sh` 测试 DashScope 连接

前端：
- `npm run dev` 启动开发服务
- `npm run build` 构建生产包

## API 概览

后端接口（部分）：
- `GET /health` 健康检查
- `GET /api/assets/:address` 资产概览（mock）
- `GET /api/protocols` 协议列表（mock）
- `POST /api/chat/strategy` 生成策略
- `POST /api/strategy/prepare` 生成前端签名所需交易
- `POST /api/strategy/execute` 执行策略（mock）
- `POST /api/strategy/track` 跟踪跨链状态
- `GET /api/transactions/:address` 交易记录
- `POST /api/transactions` 写入交易记录

## 项目结构

```
backend/
  src/
    app.ts              # API 与 Socket.io
    services/           # AI、数据、执行相关逻辑
frontend/
  src/
    pages/              # 页面（登录、仪表盘）
    components/         # UI 组件
shared/                 # 共享类型与工具
```

## 项目介绍

ZetaYield 聚焦于“用自然语言驱动跨链 DeFi 策略”的产品形态：用户输入目标与偏好，系统完成意图识别、策略生成、执行准备与结果追踪，并以可视化方式呈现资金与策略状态。项目集成了 ZetaChain 的多链能力、DashScope(Qwen) 的语义理解，以及前端实时通讯能力，形成端到端的策略闭环。

更多细节可参考 `PROJECT_STATUS.md`、`TROUBLESHOOTING.md` 与 `FRONTEND_DEBUG.md`。

## 后期规划

- 真实链上数据接入：对接多链 RPC、价格源与协议收益数据，构建统一资产视图
- 策略执行能力增强：完善交易构建、签名、广播与状态跟踪
- 策略与交易持久化：完善用户、策略、交易的数据模型与历史查询
- 前端执行流程完善：交易签名、执行进度与错误处理体验优化
- 风险评估与回测：加入历史数据驱动的策略评估与风险提示

## 贡献指南

### 开发规范

- 分支：建议基于 `main` 创建功能分支（例如 `feature/xxx`）
- 提交：清晰的提交信息，描述变更目的
- 代码风格：保持与现有代码一致；前端使用 ESLint 校验

### 常用检查

```bash
# 前端 lint
cd frontend
npm run lint
```

说明：后端暂无测试脚本（`npm test` 为占位），如需新增请先补充 `backend/package.json` 的 test 命令。

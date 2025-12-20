# ZetaYield AI
本仓库目前是一个 **正在开发中的 Demo 项目**，目标是在本次 **ZetaChain × Qwen 通用 AI 共学 / Hackathon** 中，   实现一个最小可用的 **“通用 DeFi Agent”** 原型。


一句话简介：  
> 用户用自然语言描述自己的 DeFi 操作意图，  
> Qwen 负责解析意图，  
> 后端负责把意图映射到 ZetaChain / EVM 上的具体执行计划。

目前状态：**正在搭建代码和脚本，README 先说明清楚项目目标、架构与计划**，  
---

## 🎯 项目目标

**做一件很具体的事：**

> 让用户可以用一句自然语言来描述自己的 DeFi 需求，  
> 例如：
> - 「帮我在 Base 上用 10 USDC 换成 ETH」
> - 「把我 50 U 换成 Polygon 上的 MATIC」
>
> 系统会自动完成：
> 1. 用 **Qwen-Agent** 解析自然语言，抽取出链名 / 代币 / 金额等参数；
> 2. 把解析结果转换为结构化 JSON，例如：
>    ```json
>    { "chain": "base", "tokenIn": "USDC", "tokenOut": "ETH", "amount": "10" }
>    ```
> 3. 通过一个 **通用 DeFi 路由层**，根据不同链的配置与合约，生成一条「准备执行的链上操作计划」；
> 4. 后续进阶版本中，可以对接 ZetaChain 测试网，实现真实 Swap / Messaging 调用。

---

## 🧩 项目定位（Why）

在本次 Hackathon 的两大方向中：

- **通用 DeFi（Universal DeFi）**
- **通用 AI 应用（Universal AI Applications）**

本项目落在两者交界处：

- 从 **Qwen** 的角度看：这是一个会「理解 DeFi 行为」的智能 Agent；
- 从 **ZetaChain** 的角度看：这是一个能把多链操作统一到一条链上规划的通用入口。

目标是提供一个 **Minimal but Real** 的参考实现，后续可以演进为：

- 自然语言钱包
- DeFi 意图路由器（Intent Router）
- 更复杂的策略 / 风控智能体（和后续 OmniGuardian 风控项目联动）

---

## 🧱 计划中的技术架构

> 当前仓库处于搭建阶段，下面是 **计划中的架构设计**，实际代码会按此思路迭代实现。

```text
用户自然语言输入
   │
   ▼
┌───────────────────────────────┐
│ Qwen-Agent 层                 │
│ - 工具：parse_swap_intent     │
│ - 输出：{ chain, tokenIn,     │
│           tokenOut, amount }  │
└───────────────────────────────┘
   │
   ▼
┌───────────────────────────────┐
│ 通用 DeFi 路由层              │
│ - 根据链名 / Token 选择       │
│   - 使用哪条链 (Base / Polygon / ZetaChain env) │
│   - 使用哪个合约地址          │
│   - 使用哪个 RPC              │
│ - 输出可执行的「调用计划」    │
└───────────────────────────────┘
   │
   ▼
┌───────────────────────────────┐
│ （后续）ZetaChain / EVM 调用   │
│ - 通过 web3 / ethers          │
│ - 调用 Swap / Messaging 合约  │
│ - 返回 tx hash                │
└───────────────────────────────┘
```


## 代码结构：
当前代码尚在搭建中，预计目录结构如下（计划结构，非最终）：
```text
.
├── README.md
├── requirements.txt
├── src/
│   ├── agent/
│   │   ├── qwen_client.py      # Qwen API 封装
│   │   └── intents_tool.py     # parse_swap_intent 的 Tool schema 与调用逻辑
│   ├── core/
│   │   ├── intents.py          # DeFi 意图（Intent）数据结构
│   │   ├── router.py           # 通用 DeFi 路由层：handle_swap_intent(intent)
│   │   └── chain_config.py     # 不同链的配置：RPC / 合约地址等
│   └── demo/
│       └── demo_cli.py         # 端到端 Demo 脚本（自然语言 → Agent → 路由 → 打印计划）
└── .env.example                # 环境变量示例（QWEN_API_KEY 等）
```

✅ 后续提交中，会逐步把上述模块补齐，并在 README 中标注「已完成 / 开发中」。

📆 开发计划与里程碑（Roadmap）

以下为本次 Hackathon / 共学周期内的开发计划，方便评委理解项目节奏。

✅ 阶段 1：Agent 意图解析（Day 8–10）

 搭建 Qwen API / Qwen-Agent 调用脚本

 定义 parse_swap_intent(text) Tool schema

 能稳定解析以下指令：

「帮我在 Base 上用 10 USDC 换成 ETH」

「把我 50 U 换成 Polygon 上的 MATIC」

✅ 阶段 2：通用 DeFi 路由层（Day 11–12）

 定义 DeFi 意图数据结构（Intent）

 实现 handle_swap_intent(intent)：

基于链名（chain）查找 chain_config；

选择对应合约地址 / RPC；

打印一份清晰的执行计划。

✅ 阶段 3：（可选）接入 ZetaChain 测试网（Hackathon 冲刺期）

 配置 ZetaChain 测试网 RPC

 选用官方 Example Swap / Messaging 合约

 从「打印计划」升级为「发起一笔真实测试网交易」

🧪 预期 Demo 效果（Demo Story）

在 Hackathon 的演示环节中，本项目计划展示如下流程：
终端或简单 Web 界面中，输入：

帮我在 Base 上用 10 USDC 换成 ETH


展示 Qwen-Agent 返回的结构化 JSON：
```text
{
  "chain": "base",
  "tokenIn": "USDC",
  "tokenOut": "ETH",
  "amount": "10"
}
```

展示路由层生成的执行计划，例如：
```text
目标链      : Base
输入代币    : USDC
输出代币    : ETH
数量        : 10
使用合约    : 0xBaseSwapOrZetaContract...
使用 RPC    : https://base-mainnet.example
下一步      : 通过 web3 / ethers 调用合约 swap(...) 
```
🔧 当前状态 & 后续说明

当前仓库 代码正在开发中，近期会陆续提交：

Qwen-Agent 调用脚本

parse_swap_intent Tool 定义

handle_swap_intent 路由层实现

简单 CLI Demo

本 README 先把：

项目方向

架构设计

计划结构

开发里程碑
说明清楚，方便评委与社区提前了解。


🏗 技术栈

ZetaChain
 – Universal / Omnichain Smart Contracts

Qwen / Qwen-Agent
 – LLM & Agent 框架

Python 3.9+

🤝 致谢

ZetaChain × Qwen「通用 AI 共学 / Hackathon」提供的学习指引与生态资源；

ZetaChain 官方文档与 Example 合约；

Qwen 团队提供的 API 与 Agent 能力支持。
 

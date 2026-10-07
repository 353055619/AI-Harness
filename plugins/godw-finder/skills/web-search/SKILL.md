---
name: web-search
description: 通用网页/API 检索原子技能（godw-finder 工具面）：多引擎关键词策略、agent-reach API 通道（B站/YouTube 等）、候选精读第二层与回报格式。被 godw-finder 编排层调用，也可单独使用。
---

# 网页检索原子（GitHub 侦察 / 官方+社区 / 竞品+视频 API）

## 通道分工（原 godw-research search-playbook #1/#2/#4 拆出）

| 角色 | 通道 | 要点 |
|---|---|---|
| GitHub 侦察 | WebSearch/WebFetch + gh | awesome 清单、agentskills.io、README/源码关键段精读；star/活跃度佐证 |
| 官方+社区 | WebSearch 中英双语 | 官方文档/发布说明 + issue/讨论区实战；中英各 ≥2 组关键词 |
| 竞品+视频 API | agent-reach API 通道 | B 站/YouTube 站内搜索；不依赖浏览器登录态 |

## 纪律

- 每渠道 ≥3 种关键词 × 前 2 页；宣称"没有方案"前至少换 3 种关键词。
- 候选回报三段式：**候选清单（名称|来源|一句结论）| 搜索轨迹（关键词×渠道→命中/未命中）| 一句话采用建议**。
- 只搜索回报，不写盘、不安装、不编造；链接必须真实点开过。
- 深读第二层：Top 候选精读文档/源码关键段，回报里注明"读过哪一段"。
- 并发纪律：批内 ≤2，上一批全部回报后再派下一批。

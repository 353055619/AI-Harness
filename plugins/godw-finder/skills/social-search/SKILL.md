---
name: social-search
description: 社交平台侦察原子技能（godw-finder 工具面）：browser-act 浏览器通道，现成 godw-search 浏览器单智能体单会话串行共用，平台路由表与防反爬纪律。被 godw-finder 编排层调用，也可单独使用。
---

# 社交平台侦察原子（browser-act 通道）

## 平台路由表（2026-10-06 实测口径）

| 平台 | 状态 | 通道 |
|---|---|---|
| 小红书 | ✅ 实测通 | xiaohongshu-search 技能 |
| 抖音 | ✅ | douyin-video-search 技能 |
| TikTok | ⛔ | 无账号默认不派 |
| X | ✅ | x-tweet-search 技能 |
| 知乎 | ✅ | 本地浏览器直搜（云模板弃用） |
| B 站 | ✅ | agent-reach API（归 web-search） |
| YouTube | 装好待验 | agent-reach API |
| 其余 | — | agent-reach API 兜底 |

## browser-act 使用要点

- 用现成 **godw-search 浏览器**（单智能体单会话串行共用一个，防反爬；会话用完 close）。
- 要用户看见必须 `--headed`；平台技能的 scripts 是 browser-act eval 子命令，不是 bash eval。
- BROWSERACT_API_KEY 已配（环境）；失效先自检再报障。
- 时效/生活经验/消费决策类话题，社交平台常比网页搜索更优——godw-finder 编排层会优先派本技能。

## 纪律

- 只搜索回报，不写盘、不上传、不编造；引文必须真实刷到过。
- 单平台 ≥3 组关键词；回报三段式（候选清单|轨迹|一句结论）与 web-search 一致。
- 风控报错（如小红书 300012）如实回报并换渠道，不硬闯。

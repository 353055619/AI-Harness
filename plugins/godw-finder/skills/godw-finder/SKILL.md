---
name: godw-finder
description: godw 统一搜索入口（编排技能）：抽象问题 → 4 智能体全调研（GitHub 侦察/官方+社区/社交平台/竞品+视频）+ 工具面（plugin-finder/skill-finder/web-search/social-search 按需调）→ 分级采用 → 落盘 reference/（survey 文件+镜像+AGENTS.md 索引）。被 godw-loop-start 调用，也可用户直呼"搜一下 X / 调研 X"。
---

# 统一搜索入口 → reference/

单模式：**4 智能体全调研**（无 standard 档；2026-10-07 定稿，原 godw-research 进化）。

## 八步

1. **抽象问题**：去掉项目语境，提炼可检索的通用问题。
2. **分派 4 调研智能体**（并发 ≤2 分批接力：批 1 = #1/#2 网页 API 组，批 2 = #3/#4；批内失败先原渠道重派一次）：
   - #1 GitHub 侦察（含 awesome 清单/agentskills.io 技能生态）
   - #2 官方方案 + 社区实战（中英双语）
   - #3 社交平台侦察（单智能体单会话串行共用浏览器，走 social-search 技能）
   - #4 竞品扫描 + 视频平台 API 组（B 站/YouTube，走 agent-reach API 通道，见 web-search 技能）
   每渠道 ≥3 种关键词 × 前 2 页；子智能体提示词自包含（只搜索回报不写盘，回报=候选清单|轨迹|一句结论，禁编造）。
3. **工具面按需**：找 ZCode 插件 → plugin-finder；找 agent skill → skill-finder（含安装安全审查）；网页/API 检索要点 → web-search；社交平台要点 → social-search。
4. **深读第二层**：高命中候选精读（文档/源码关键段）。
5. **汇总评估**：多智能体命中同一是质量信号；分级采用（直接用 > 裁剪用 > 借鉴 > 自研，注明出处）。
6. **落盘 reference/**：
   - 4 份调研报告：`reference/survey-<theme>-YYYYMMDD.md`（每智能体一份：候选表/搜索轨迹/采用建议）；
   - 素材镜像：直接用/裁剪用必拉（代码仓 `git clone --depth 1`、一候选一目录、根放来源 URL 与日期），按主题组织；
   - **索引**：`reference/AGENTS.md` 维护（survey 清单+镜像目录+日期+一句用途；只增；<128 行预算门，超限提额）。
7. **采用建议返回**：给调用方（godw-loop-start 或用户）分级清单与出处；确无方案写明已搜渠道防重复搜。
8. **完成门**：4 份 survey 在场带轨迹；镜像带来源；索引已更新；调研 ≠ 实现授权（提案由调用方定稿）。

## 平台路由速查（详表见 social-search）

小红书 ✅ · 抖音 ✅ · TikTok ⛔（无账号默认不派）· X ✅ · 知乎 ✅ · B 站 ✅ · YouTube 装好待验 · 其余 agent-reach API 通道。

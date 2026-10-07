# godw-finder

godw 统一搜索调研插件（v0.1.0，2026-10-07 自 godw-research + plugin-finder + skill-finder 合并进化）。

## 技能（1 编排 + 4 原子）

| 技能 | 职责 |
|---|---|
| godw-finder | 编排统一入口：4 智能体全调研（≤2 并发分批接力）→ 分级采用 → reference/ 落盘（survey×4 + 镜像 + reference/AGENTS.md 索引） |
| plugin-finder | 本地插件市场离线搜索（自 plugin-finder 插件平移） |
| skill-finder | 互联网 skill 多引擎搜索 + 安装安全审查（自 skill-finder 插件平移） |
| web-search | 网页/API 检索原子（GitHub 侦察/官方社区/竞品视频，agent-reach 通道） |
| social-search | 社交平台侦察原子（browser-act 浏览器通道 + 平台路由表） |

依赖：browser-act / agent-reach 技能与 BROWSERACT_API_KEY（社交面）；plugin-finder/skill-finder 原独立插件同日退役。

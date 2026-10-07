# 搜索引擎手册（2026-10 实测；接口变动时先 curl 验证再改代码）

统一入口 `scripts/search_skills.py`，每引擎独立降级（单引擎失败不影响整体），`--engines a,b` 选子集。

## 1. skillsmp（主发现引擎）

- 聚合 GitHub 上 3M+ SKILL.md，唯一实测免认证搜索 API。
- `GET https://skillsmp.com/api/v1/skills/search?q=<kw>&sortBy=stars&limit=20`
- 包络 `{"success":true,"data":{"skills":[{name, author, description, githubUrl, skillUrl, stars, updatedAt}]}}`
- 配额：匿名 50 req/天、10 req/分钟；免费 API key 500/天（未内置，可自行加）。超限返回 429/403 → 换其他引擎。
- `githubUrl` 形如 `github.com/<owner>/<repo>/tree/main/<subpath>`，可直接喂给 install_skill.py。

## 2. anthropics/skills 官方仓库

- 20 个官方 skill（pdf/docx/pptx/xlsx、skill-creator、mcp-builder、webapp-testing、frontend-design…），质量最高。
- 枚举 `GET api.github.com/repos/anthropics/skills/contents/skills`（1 次请求，配额 60/h），逐目录读 `raw.githubusercontent.com/anthropics/skills/main/skills/<name>/SKILL.md`（raw 不占 API 配额），解析 frontmatter description 做关键词匹配。
- 整包目录已缓存到 `$TMPDIR/skill-finder/anthropics-skills.json`（24h），二次调用零请求。

## 3. awesome 精选清单

- `BehiSecc/awesome-claude-skills`（主，10k+ stars）与 `travisvn/awesome-claude-skills` 全量解析；`hesreallyhim/awesome-claude-code` 只取 Skills 小节（54k+ stars 的大杂烩）。
- 拉 raw README（缓存 24h），正则解析 `- [name](github-url) - desc` 行，GitHub 链接归一为 owner/repo[/subpath]。
- 注意：awesome-claude-code 仓库名是 hesreallyhi**m**（曾写错成 hesreallyim 导致 404）。

## 4. GitHub Code Search（需 PAT）

- `GET api.github.com/search/code?q=filename:SKILL.md+<kw>&per_page=20`，请求头 `Authorization: Bearer $GITHUB_TOKEN`。
- 匿名必 401；配额 10 req/min。覆盖全 GitHub，召回最广但噪音大。检测到环境变量 GITHUB_TOKEN 才启用。

## 5. Meyo DeepSkill Market（封装 deep-skill-finder）

- 前置条件：`~/.agents/skills/deep-skill-finder/scripts/deep_skill_search.py` 存在。
- 调用：`python3 <该脚本> "<query>"`，stdout JSON `{community:[{name, description, downloadCount, reason}], requestId}`；超时给 60s+。
- 隐私：该服务带持久 `X-Client-Id`（~/.deep_skill_finder/client_id）遥测；呈现 Meyo 结果时须向用户注明。
- 安装走它自带的 `deep_skill_install.py <name> --dir <目录>`（zip 下载 + 安全校验），不用本插件的 install_skill.py。

## 6. npx skills（Vercel vercel-labs/skills CLI）

- 仅探测 `npx` 是否存在并提示用户；交互式，不适合 agent 代跑。
- `npx skills find <kw>` 交互搜索；`npx skills add <owner/repo> -g --copy` 全局安装（自动探测各 agent 的 skills 目录，`--copy` 避免符号链接）。

## 已排除的源（勿再加）

- skills.sh HTTP API：仅接受 Vercel OIDC token（部署在 Vercel 内才能调），401。
- skillshq.io：域名不存在。
- mcpservers.org：Cloudflare 403 / 路径 404，不稳定。

## 排序权重

anthropic(100) > awesome(60) > skillsmp(50) > meyo(40) > ghcode(20)，叠加 stars（cap 2000）与关键词命中（名称+5/描述+2）；Meyo 的 downloadCount 当 stars 用。

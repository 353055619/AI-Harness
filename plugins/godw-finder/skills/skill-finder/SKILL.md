---
name: skill-finder
description: 多引擎搜索互联网上的 agent skill 并安装到用户级或项目级。当用户想"找一个能做 X 的 skill""装一个某领域的技能""从 GitHub 找 skill"时使用。触发词：找技能、找 skill、搜 skill、skill finder、装个技能、推荐 skill。
---

# skill-finder：多引擎找 skill 并安装

内置 6 引擎（按条件自动启用）：skillsmp 聚合 API、anthropics/skills 官方库、awesome 精选清单、GitHub Code Search（需 GITHUB_TOKEN）、Meyo deep-skill-finder（需已装，带遥测）、npx skills（探测提示）。

## 工作流

1. 提炼 1-3 个关键词（英文为主，可中英并用）。
2. 搜索：
   ```bash
   python3 <skill目录>/scripts/search_skills.py <关键词>... [--engines skillsmp,anthropic,awesome] [--json]
   ```
   输出合并去重后的候选表（技能/来源/stars/命中引擎/描述）+ 各引擎状态。单引擎失败属正常降级。
3. 结合用户场景挑 2-3 个重点推荐：优先官方仓库与高星来源；Meyo 结果须注明"该服务带 clientId 遥测"；描述栏为空的高噪音结果（ghcode）谨慎推荐。
4. 用户选定后，先做安全审查：
   ```bash
   python3 <skill目录>/scripts/install_skill.py <owner/repo[:子路径]> --level user|project --dry-run
   ```
   按 `references/install-conventions.md` 检查 frontmatter、scripts 可疑命令、注入迹象、许可证，向用户展示要点。
5. 问用户装到哪级：通用技能推荐 user（`~/.agents/skills/`，全局），项目绑定选 project（`./.agents/skills/`）。确认后去掉 `--dry-run` 执行。
6. 安装完成提醒：新开会话生效；可用 `--list` 查看、`--uninstall` 卸载。

## 边界

- Meyo 来源的技能改用 deep-skill-finder 自带 `deep_skill_install.py` 安装（见 references/install-conventions.md）。
- 引擎接口变动时按 `references/engines.md` 的端点逐个 curl 验证，勿凭记忆改。
- 不装来源不明（非 GitHub、无 SKILL.md）的东西；仓库含多个 skill 时让脚本列出候选由用户选。

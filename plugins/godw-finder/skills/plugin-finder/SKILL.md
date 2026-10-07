---
name: plugin-finder
description: 在本机已配置的 ZCode 插件市场里搜索合适插件并指引安装。当用户想"找一个能做 X 的插件""看看有哪些插件可用""某个插件装没装"时使用。触发词：找插件、搜插件、plugin finder、有什么插件、插件推荐。
---

# plugin-finder：离线搜索已配置的插件市场

搜索范围 = 用户已添加的全部市场（如 zcode-plugins-official、claude-plugins-official、developer-kit，共 300+ 条），数据全在本地，无需联网。

## 工作流

1. 从用户需求提炼 1-3 个关键词（英文命中率更高，可中英并用，如 "pdf 文档"）。
2. 运行：
   ```bash
   python3 <skill目录>/scripts/find_plugins.py <关键词>...
   ```
   常用参数：`--market <市场id>` 限定市场；`--installed` 只看已装；`--json` 拿完整字段（含 source、requiresPaidPlan）；`--list-markets` 列市场；`--all` 含非用户可见条目。
3. 呈现结果（脚本已输出 Markdown 表：插件@市场、状态三态、分类、中文描述）：
   - 结合用户场景给 1 句推荐理由，不要罗列全部。
   - 标注付费插件（JSON 里 `requiresPaidPlan: true`）。
   - 同名插件跨市场时说明差异（官方市场通常有中文描述与本地缓存）。
4. 安装指引（宿主无插件 CLI，需用户在 UI 操作）：
   - 插件市场 → 个人 → 对应市场 → 选中插件 → Install。
   - 状态"已装·未启用"的：设置 → 插件 里开启。
   - 装完提醒：新开会话生效。
5. 用户想深入了解某插件时：按 `references/data-sources.md` 的读取链路找到插件目录，读其 skills 清单。

## 兜底

脚本不可用时按 `references/data-sources.md` 直接读本地 JSON 完成同样的搜索与判定，不要凭记忆报插件清单。

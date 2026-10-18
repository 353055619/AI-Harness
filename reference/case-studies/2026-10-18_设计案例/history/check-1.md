# 一致性校验 · 2026-10-18 · 阶段 arch（1b 首版）

- **机械级**：
  - 第 1 轮 FAIL（17 类失败项）：flows.底座公共流 actor「全部角色」未在 roles 定义；9 个记录型实体 states 空数组违反脚本规则；GR-01/GR-02 未在 gate-registry.md 登记（脚本只认登记表）；trace 引用 D-001/D-004/D-005（D 编号非合法 trace 值）。
  - 修复：删除底座公共流（工作空间/通知/附件由 pages+entities 承载）；记录型实体补最小真实状态（如 白名单条目=生效/失效、消息通知=未读/已读）；新建 history/gate-registry.md 登记 GR-01/GR-02（出处 D-002/D-006）；trace 中 D 引用移除（裁决出处保留在正文与 DECISIONS）。
  - **第 2 轮：PASS**（exit 0，0 failures 0 warnings）。
- **语义级：PASS**
  - 防假链：追踪表各行业务/应用架构节号实读核对，内容承载对应需求；NFR-05 落点由 §1 修正为 §5（不变量7）。
  - 防发明：detail.json 全部元素 trace 指向合法 FR/NFR/GR（或经登记的 GR）；四文档无无出处设计元素。
  - 互引：文档间交叉引用（业务架构 §4 等）节号真实存在。
  - 术语一致：技术架构「工作台」统一为「工作空间」；术语.md 增补「非采支付单」。
  - 交叉索引：节标题 [FR/NFR/GR] 标注 ⊆ 追踪表登记行；反向登记节 ⊆ 文档实际节。
- **结论：放行进评委（1c 门1）**。
- 备注：Mermaid 图（C4 Context/Container/Deployment、erDiagram、3×stateDiagram、3×flowchart、2×sequence）未做渲染级验证（本机无 mmdc），已按语法规范逐图自查；如门1 发现渲染问题属修订事项。

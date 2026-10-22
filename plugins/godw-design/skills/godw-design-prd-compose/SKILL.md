---
name: godw-design-prd-compose
description: PRD 成文原子技能（godw-design 家族）：阶段3-a——读实例 原始需求.md + 4A架构/detail.json + 业务架构§3.0 用例总览 + 身份卡.md 考题，产出 PRD/ 目录（PRD-<设计名>.md 总览 + 每功能模块 PRD-<模块名>.md）。按 prd-template 成文：EARS 验收标准（WHEN/IF/WHILE…SHALL，每功能≥1 条异常 AC）、Assumptions 与 [NEEDS CLARIFICATION] 双通道（不许编造）、禁词自查、单模块 AC ≤30、字段只引 detail.json（双写红线）。只产出 PRD，不进原型；完成后 bash 真跑 godw-design-check --phase prd 并原样贴 JSON 输出。
---

# PRD 成文 → PRD/（总览 + 每功能模块一个文件）

## 输入（强制，缺则报错退出，不反问用户）

- 实例的 `原始需求.md`（FR/NFR）+ `4A架构/detail.json` + `4A架构/业务架构.md`（模块来源=§3.0 用例总览的业务域）+ `身份卡.md`（角色与考题）——任一缺失 → 失败退出提示先跑对应阶段。
- `参考资料/INDEX.md` 待内化项：影响 PRD 的（交互/界面呈现类）在本阶段一并吸收（记 DECISIONS 出处，INDEX 状态更新）。
- 实例定位：`design/change/` 唯一实例自动定位，多实例时须由调用方指明实例名。

## 模块拆分规则

- 模块 = 业务架构§3.0 用例总览的业务域；模块名直接用域名（PRD 文件名与总览表严格一致）。
- `PRD/PRD-<设计名>.md` = 总览（设计名 = 实例目录名去掉日期前缀）。
- 每业务域一个 `PRD/PRD-<模块名>.md`；跨域的公共界面约定（统一待办、消息中心）放总览§2 模块依赖与共用。

## 成文纪律（八条，逐条自查后才落盘）

1. **模板严格**：按 [references/prd-template.md](references/prd-template.md) 两套骨架成文；模板头部注释是给成文 agent 的守则，逐条遵守。
2. **双写红线**：字段级明细只引 detail.json（如「金额——detail.entities.申请单.amount」）；业务规则本体在业务架构（PRD 引用规则编号，只写界面如何体现）；状态机在信息架构（PRD 只写界面呈现）。
3. **AC 全 EARS**：每条 `AC-<模块名>-NNN` 必须以 WHEN/IF/WHILE/WHERE/THE 开头且含 SHALL，一句一个可判对错的断言；单模块 ≤30 条；**每功能至少一条异常 AC**（`IF <条件> THEN THE 系统 SHALL <显示什么，显示在哪>`），异常呈现引用总览§3 全局状态清单。
4. **用户故事具体化**：角色用岗位名（「采购员」不是「用户」）；每功能附「为什么是这个优先级」与「如何独立验证」。
5. **Non-Goals 带理由**：本模块/本功能不做的每条说明为什么不做。
6. **歧义双通道**：能定默认 → 写进 Assumptions（每条带依据）；定不了 → 正文原位 `[NEEDS CLARIFICATION: 原因]` 并汇总进开放问题表——**禁止编造补位**。
7. **禁词自查**：效率高、交互完美、fast、easy、intuitive、优雅、流畅——一律改写为可观察的界面行为；一条 AC 只允许一种合理解读。
8. **溯源**：每文件头部 Input 行写明源自哪些 FR/GR/考题；每道身份卡考题 T-xx 必须在本模块有功能落点（check 会查）。

## 输出（严格按模板；PRD 是活文档，评审迭代中可修订）

- `PRD/PRD-<设计名>.md`（总览：模块表 / 依赖与共用 / 全局界面状态清单）
- `PRD/PRD-<模块名>.md` × N（功能清单 / 功能详述 / Assumptions 与开放问题）
- 每文件头部版本行 + Input 溯源行。

## 完成门

1. 三方一致：总览表模块/页面 ↔ 模块文件 ↔ detail.json pages（check 双向覆盖校验兜底）。
2. 每道身份卡考题 T-xx 有功能落点；六类题型都能在 PRD 找到对应功能或明确 Non-Goals。
3. 禁词零命中；无 TBD/空话；NEEDS CLARIFICATION 已汇总开放问题表。
4. **bash 真跑 `godw-design-check --phase prd` 并原样贴 JSON 输出**（ranAt 是真跑凭证；不过打回修订）。
5. 只产出 PRD——不写原型、不改 4A 文档（发现 4A 问题 → 返回调用方走门1 修订，不顺手改）。
6. 返回：PRD 文件清单、功能数/AC 数、NEEDS CLARIFICATION 清单、check 结果，后续动作由调用方决定（通常是阶段3-b 对抗审查）。

# goal 模式启动模板（v4）

循环驱动=ZCode 原生 `/goal` 会话目标：init 收尾后用户在项目根会话运行一次 `/goal <目标文本>`，客户端自动迭代推进，每轮迭代走一遍技能链（start→run→complete）。会话关闭循环即停，回来重设同一目标即续。

## 启动（目标文本原样使用）

```
/goal 持续推进本项目 godw-loop 循环：每轮依次执行 godw-loop-start（提案）→ godw-loop-run（派发执行）→ godw-loop-complete（收口）；完整契约读 godw-loop 插件 skills/godw-loop-start/references/loop-contract.md，冲突以契约为准；验收锚=.agents/GOAL.md 第二章与 AC；铁律：不写 workspace/human/、不改 GOAL.md、CHAT.md 只增、notes/ 内容禁经 Bash 写入、删除先进 .trash、宣称完成必须有当场验证过的输出。队列空转记 noop，不得擅自结束循环。
```

手动跑单轮不走 goal：直接调 `/godw-loop-start`（提案）起步按链推进。

## 管理命令

- `/goal`：查看当前目标与迭代进度
- `/goal pause` / `/goal resume`：暂停/恢复自动迭代（人工介入用 pause）
- `/goal clear`：结束循环（GOAL.md 不动，随时可重新启动）

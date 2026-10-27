# godw-loop 插件源（开发区）

- 本目录是插件开发区源（安装经 install-plugin-file.sh → ~/.agents/plugins/godw-loop/ + ZCode cache；此处直改不安装不生效于运行时）。
- 铁律：循环契约以 skills/godw-loop-start/references/loop-contract.md 为准，冲突以契约为准；guard.py 改动必须带 scripts/test-guard.sh 新用例（bash scripts/test-guard.sh 全绿才算完）；版本号在 .zcode-plugin/plugin.json 与 README 同步。
- 目录：skills/ 六技能 · hooks/ + scripts/guard.py 守卫 · goal 启动模板随 init 分发（skills/godw-loop-init/references/goal-prompt.md；驱动=ZCode 原生 /goal 会话目标）。

# godw-toolkit 插件源（开发区）

- 本目录是插件开发区源（安装经 install-plugin-file.sh → ~/.agents/plugins/godw-toolkit/ + ZCode cache）。
- 铁律：无前缀技能目录（vendored 14 件）只读、带 .origin.json 溯源；改造成果只进 godw* 层；循环相关技能已拆往 godw-loop 插件、搜索拆往 godw-finder 插件（2026-10-07 v3 改版）；hooks 已随 guard 移入 godw-loop；版本号在 .zcode-plugin/plugin.json 与 README 同步。

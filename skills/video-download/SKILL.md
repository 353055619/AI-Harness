---
name: video-download
description: Download a video or audio track from a URL to local disk using yt-dlp, with fallbacks for X/Twitter (fxtwitter API) and login-gated content (browser cookies). Use whenever the user gives a video/media link and wants it saved locally — "下载这个"、"下到桌面"、"存到本地"、"save this video" — even when no tool is named. Covers YouTube, Bilibili, X/Twitter, Douyin and thousands of other yt-dlp-supported sites.
---

# video-download

把一个 URL 指向的视频或音频下载到本地磁盘。前置工具：`yt-dlp`、`ffmpeg`、`curl`（本机均已装好）。

## 默认值（用户没说就静默采用，不要反问）

- 保存位置：`~/Desktop`；用户指明了目录就用用户的。
- 画质：最高。若源头本身就低（如 X 视频最高 720P），在最终汇报里说明是源上限，不要让人误以为能更高。
- 默认只交付视频一个文件，但必须自带声音；源本身有音轨就照常下载，不额外产出音频文件。用户主动要音频时才转 MP3（见流程）。
- 文件名：视频走 yt-dlp 默认命名；X 兜底路径用 `<用户名>_<推文ID>.mp4`。

## 流程

1. 先用 yt-dlp 直下：
   ```
   yt-dlp -P ~/Desktop "<url>"
   ```
   - URL 是列表/页面里单个视频、用户只要那一条 → 加 `--no-playlist`。
   - 只要音频 → `yt-dlp -x --audio-format mp3 --audio-quality 0 -P ~/Desktop "<url>"`。

2. 失败先诊断根因，不要原样重试——同一命令失败第二次就是浪费，直接换路。
   - **X/Twitter**（报 "No video could be found in this tweet"、guest token / GraphQL 失败）：推文里通常真有视频，是 X 封了游客提取。走开放的 fxtwitter 接口拿直链：
     ```
     curl -s https://api.fxtwitter.com/<user>/status/<tweet_id>
     ```
     视频直链在 `tweet.media.videos[*].url`（`url` 字段即最高码率版本；多条媒体看 `media.all`）。拿到后：
     ```
     curl -sL -o ~/Desktop/<user>_<tweet_id>.mp4 "<视频直链>"
     ```
   - **需要登录的内容**（会员、年龄限制、私密）：改用浏览器登录态重试一次：`yt-dlp --cookies-from-browser chrome ...`（chrome/firefox 可用；Safari 的 cookie 受沙盒保护，通常取不到）。
   - **YouTube 报 "n challenge solving failed" 警告**：JS 挑战求解脚本缺失/过期，部分画质会拿不到。修复：`uv tool install --force "yt-dlp[default]"`（本机 uv 安装，ejs 包随 extra 补齐）。
   - 其他站点：把 yt-dlp 的原始报错和可能原因（站点封数据中心 IP、DRM、直播流）如实告诉用户，不要编造绕过方案。

3. 宣称完成前必须校验：文件存在、大小 > 0、`file <路径>` 输出是媒体容器（MP4/MKV/WebM 等）。下出来 0 字节或 HTML 文件视同失败，走兜底。
   - 视频还要确认自带声音：`ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 <视频>` 有输出才算数。纯视频流视为不完整：换含音频的格式重下（yt-dlp 保持默认的 `bv*+ba/b` 合并策略即可），或用 ffmpeg 把单独拿到的音频流合进视频里——只交付一个带声音的视频文件，不留散装音轨。

4. 最终汇报一行：绝对路径 + 大小 + 分辨率/格式（知道就报），不贴命令日志。

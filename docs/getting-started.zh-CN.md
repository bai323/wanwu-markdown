# 新手教程

这份教程假设你第一次用 GitHub 上的开源项目，也第一次运行本地 Node.js 工具。按顺序来，不需要先理解所有概念。

## 1. 下载项目

如果你会用 Git：

```bash
git clone https://github.com/bai323/wanwu-markdown.git
cd wanwu-markdown
```

如果你不会用 Git，也可以在 GitHub 页面点绿色的 `Code` 按钮，选择 `Download ZIP`，解压后进入项目文件夹。

## 2. 安装 Node.js

需要 Node.js 22 或更新版本。已经安装的话，可以在终端里检查：

```bash
node -v
```

如果版本低于 22，先去 Node.js 官网安装新版。

## 3. 启动工作台

在项目目录运行：

```bash
npm install
npm start
```

看到服务启动后，打开：

```text
http://localhost:4173
```

macOS 用户也可以双击 `启动万物Markdown.command`。第一次运行会稍慢，因为它会安装依赖。

## 4. 选择入口

网页文章：适合公众号文章、X 帖文、普通网页。把浏览器地址栏里的 URL 粘进去。

AI 对话：适合 Claude、ChatGPT、Gemini、Codex 这类网页对话。先打开目标对话，再复制当前 URL。

浏览器插件：目前主要用于 Sider。先在 Chrome 的 Sider 插件里打开目标对话，再回到工作台点“重新检测当前对话”。

导入文件：适合已经有 JSON 或 conversation graph 的情况。不用先理解 JSON，把它当作可恢复的存档文件即可。

## 5. 看结果

分支：查看对话是否有多条回复路径。

报告：生成 HTML 分支报告，适合分享或复盘。

Markdown：最常用的输出，适合放进 Obsidian 或其他笔记工具。

结构数据：给开发者或后续自动处理使用。

训练数据：JSONL 草稿，不建议未经清洗就直接训练模型。

## 6. 写入 Obsidian

展开左侧的 `Obsidian 输出`，选择或填写 Vault 路径，再点击 `存入 Obsidian`。

默认会把 Markdown、JSONL 和分支报告写入：

```text
万物Markdown/采集资产
```

## 常见问题

页面采集失败：先确认网页能在浏览器里正常打开。有些网页需要登录，或不允许直接抓取。

AI 对话是空的：很多 AI 产品使用动态加载和权限控制。可以尝试官方导出、复制内容，或先保存成结构化文件再导入。

Sider 检测不到：确认目标对话已经在 Chrome 的 Sider 插件里打开，并且选择了正确的 Chrome 配置。

担心隐私：默认输出在本机。不要把私人对话、客户资料或未经授权的内容上传到公开仓库。

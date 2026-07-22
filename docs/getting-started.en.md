# Beginner guide

This guide assumes you are new to GitHub projects and local Node.js tools. Follow the steps in order. You do not need to understand everything first.

## 1. Get the project

If you use Git:

```bash
git clone https://github.com/bai323/wanwu-markdown.git
cd wanwu-markdown
```

If you do not use Git yet, open the GitHub page, click the green `Code` button, choose `Download ZIP`, unzip it, and enter the project folder.

## 2. Install Node.js

Wanwu Markdown needs Node.js 22 or newer. Check your version:

```bash
node -v
```

If the version is below 22, install a newer Node.js release first.

## 3. Start the workbench

Run this in the project directory:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4173
```

On macOS, you can also double-click `启动万物Markdown.command`. The first run may take longer because dependencies are installed.

## 4. Choose an input

Web pages: for WeChat articles, X posts, and regular web pages. Paste the URL from your browser address bar.

AI chats: for Claude, ChatGPT, Gemini, Codex, and similar web chats. Open the target conversation, then copy the current URL.

Browser plugin: currently focused on Sider. Open the target Sider chat in Chrome, then return to the workbench and click `Detect current chat`.

Import file: for JSON or conversation graph files. Treat JSON as a recoverable archive file.

## 5. Read the outputs

Branches: see whether a conversation has multiple reply paths.

Report: build an HTML branch report for review or sharing.

Markdown: the main output for Obsidian and other note tools.

Structured data: useful for developers and later automation.

Training data: a JSONL draft. Do not train on raw output without cleaning and review.

## 6. Save to Obsidian

Open `Obsidian output`, choose or enter your vault path, then click `Save to Obsidian`.

By default, files are written to:

```text
万物Markdown/采集资产
```

## Common issues

Capture fails: first check that the page opens normally in your browser. Some pages require login or block automated capture.

AI chat is empty: many AI products use dynamic loading and access control. Try official export, manual copy, or structured file import.

Sider is not detected: make sure the target chat is open in the Chrome Sider plugin and that the right Chrome profile is selected.

Privacy: outputs are local by default. Do not upload private chats, client material, or unauthorized content to a public repository.

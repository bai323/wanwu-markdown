import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('万物 Markdown 对话工作台', () => {
  it('提供网页文章、AI 对话、浏览器插件和导入文件四种入口', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /data-source="web"/);
    assert.match(html, /data-source="ai"/);
    assert.match(html, /data-source="sider"/);
    assert.match(html, /data-source="json"/);
    assert.match(html, />浏览器插件<\/button>/);
    assert.doesNotMatch(html, />Sider 本地<\/button>/);
    assert.match(html, /当前支持：Sider 插件/);
    assert.match(html, /value="wechat-article"/);
    assert.match(html, /value="x-article"/);
    assert.match(html, /value="claude-chat"/);
    assert.match(html, /value="codex-chat"/);
    assert.match(html, /value="kimi-chat"/);
    assert.match(html, /id="profile-select"/);
    assert.match(html, /id="sider-chat-select"/);
    assert.match(html, /id="detect-sider-button"/);
    assert.match(html, /id="detected-chat"/);
    assert.match(html, /id="json-file-input"/);
    assert.match(script, /loadSiderConversations/);
    assert.match(script, /当前选中/);
  });

  it('提供一键写入 Obsidian Vault 的资产出口', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /id="obsidian-vault-select"/);
    assert.match(html, /id="obsidian-vault-path"/);
    assert.match(html, /id="obsidian-folder"/);
    assert.match(html, /id="obsidian-export-button"/);
    assert.match(html, /存入 Obsidian/);
    assert.match(script, /loadObsidianVaults/);
    assert.match(script, /exportToObsidian/);
    assert.match(script, /\/api\/obsidian\/export/);
  });

  it('面向新手解释 AI 对话 URL 和 JSON 导入场景', async () => {
    const html = await readFile('public/index.html', 'utf8');

    assert.match(html, /导入文件/);
    assert.doesNotMatch(html, /data-source="json">JSON<\/button>/);
    assert.doesNotMatch(html, /导入对话 JSON/);
    assert.match(html, />结构数据</);
    assert.match(html, />训练数据</);
    assert.match(html, /复制浏览器地址栏里的链接/);
    assert.match(html, /Claude、ChatGPT、Gemini、Kimi/);
    assert.match(html, /Codex 网页对话/);
    assert.match(html, /私有对话需要登录态/);
    assert.match(html, /打开采集窗口/);
    assert.match(html, /Sider 插件不用 URL/);
    assert.match(html, /不用先理解 JSON/);
    assert.match(html, /可以把它理解成“可恢复的存档文件”/);
    assert.match(html, /适合导入历史采集结果/);
    assert.match(html, /conversation\.graph\.json/);
    assert.match(html, /dataset\.jsonl/);
  });

  it('默认界面像本地 App，主流程只保留采集与保存', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /一键生成 Markdown、美观报告和结构化资产/);
    assert.match(html, /class="app-actions"/);
    assert.match(html, /id="settings-button"/);
    assert.match(html, /id="settings-panel"/);
    assert.match(html, /data-i18n="settings\.title"/);
    assert.match(html, /智能标注/);
    assert.match(html, /AI 辅助生成初稿标签/);
    assert.match(html, /data-source-panel="web"[\s\S]*文章 URL[\s\S]*开始采集/);
    assert.match(html, /data-source-panel="ai"[\s\S]*对话页面 URL[\s\S]*采集 AI 对话/);
    assert.match(html, /class="settings-panel"[\s\S]*data-i18n="common\.advanced"/);
    assert.doesNotMatch(html, /<section class="quick-start"/);
    assert.doesNotMatch(html, /<section class="feature-list"/);
    assert.doesNotMatch(html, /<section class="live-capture-panel"/);
    assert.doesNotMatch(html, /data-source-panel="web"[\s\S]*<details class="advanced-options">[\s\S]*适配器/);
    assert.doesNotMatch(html, /data-source-panel="ai"[\s\S]*<details class="advanced-options">[\s\S]*大模型来源/);
    assert.doesNotMatch(html, /download-app-link/);
    assert.doesNotMatch(html, /下载 App/);
    assert.doesNotMatch(script, /download\.app/);
    assert.doesNotMatch(html, /屠夫召回/);
  });

  it('提供中英文产品界面切换', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /id="language-select"/);
    assert.match(html, /<option value="zh">ZH<\/option>/);
    assert.match(html, /<option value="en">EN<\/option>/);
    assert.match(html, /data-i18n="brand\.tagline"/);
    assert.match(script, /Everything Markdown/);
    assert.match(script, /Markdown, visual reports, and agent-ready archives/);
    assert.match(script, /Markdown、美观报告和结构化资产/);
    assert.doesNotMatch(script, /Wanwu Markdown/);
    assert.match(script, /Background settings/);
    assert.match(script, /Experimental/);
    assert.match(script, /Draft labels with AI/);
    assert.match(script, /EverythingMarkdown\/captures/);
    assert.match(script, /Web pages/);
    assert.match(script, /Capture AI chat/);
    assert.match(script, /Kimi chat/);
    assert.match(script, /localStorage\.setItem\('wanwu-language'/);
  });

  it('提供分支对比、模型图例、主分支和 HTML 报告入口', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /id="branch-comparison"/);
    assert.match(html, /id="model-legend"/);
    assert.match(html, /data-graph-mode="mainline"/);
    assert.match(html, /id="report-button"/);
    assert.match(html, /id="report-preview"/);
    assert.match(html, /data-tab="report"/);
    assert.match(html, /生成分支报告/);
    assert.match(script, /modelFamily/);
    assert.match(script, /branchColumn/);
    assert.match(script, /报告已生成/);
    assert.match(script, /reportPreview\.srcdoc/);
  });

  it('提供对话资产包和打开窗口实时采集入口', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /id="live-open-button"/);
    assert.match(html, /id="live-capture-button"/);
    assert.match(html, /data-i18n="live\.open"/);
    assert.match(html, /data-i18n="live\.capture"/);
    assert.match(html, /实验功能/);
    assert.match(html, /如果一直转圈，请先用普通采集或浏览器插件/);
    assert.match(html, /data-i18n="tabs\.bundle"/);
    assert.match(script, /conversation asset bundle/i);
    assert.match(script, /\/api\/live\/open/);
    assert.match(script, /\/api\/live\/capture/);
    assert.match(script, /AbortController/);
    assert.match(script, /打开超时，请先用普通采集或浏览器插件/);
    assert.match(script, /manifest\.json/);
  });

  it('macOS 启动脚本使用独立 App 窗口打开本地工作台', async () => {
    const startScript = await readFile('Start-Everything-Markdown.command', 'utf8');
    const zhScript = await readFile('启动万物Markdown.command', 'utf8');

    assert.match(startScript, /--app=http:\/\/localhost:4173/);
    assert.match(startScript, /Google Chrome\.app/);
    assert.doesNotMatch(startScript, /\nopen http:\/\/localhost:4173/);
    assert.match(zhScript, /--app=http:\/\/localhost:4173/);
    assert.doesNotMatch(zhScript, /\nopen http:\/\/localhost:4173/);
  });

  it('本地 App 静态资源禁用缓存，避免旧界面残留', async () => {
    const server = await readFile('src/server.js', 'utf8');

    assert.match(server, /cache-control/);
    assert.match(server, /no-store/);
  });
});

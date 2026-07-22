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
    assert.match(html, /Claude、ChatGPT、Gemini/);
    assert.match(html, /Codex 网页对话/);
    assert.match(html, /想免 URL/);
    assert.match(html, /浏览器插件可以直接读取 Sider/);
    assert.match(html, /Claude、ChatGPT、Codex 这类云端对话/);
    assert.match(html, /Sider 插件不用 URL/);
    assert.match(html, /不用先理解 JSON/);
    assert.match(html, /可以把它理解成“可恢复的存档文件”/);
    assert.match(html, /适合导入历史采集结果/);
    assert.match(html, /conversation\.graph\.json/);
    assert.match(html, /dataset\.jsonl/);
  });

  it('默认界面精简，把专业设置收进高级选项', async () => {
    const html = await readFile('public/index.html', 'utf8');

    assert.match(html, /一键整理你有权保存的网页、对话和资料/);
    assert.match(html, /高级设置/);
    assert.match(html, /data-source-panel="web"[\s\S]*<details class="advanced-options">[\s\S]*适配器/);
    assert.match(html, /data-source-panel="ai"[\s\S]*<details class="advanced-options">[\s\S]*大模型来源/);
    assert.match(html, /<summary data-i18n="obsidian\.title">Obsidian 输出<\/summary>/);
    assert.doesNotMatch(html, /屠夫召回/);
  });

  it('提供中英文产品界面切换', async () => {
    const html = await readFile('public/index.html', 'utf8');
    const script = await readFile('public/app.js', 'utf8');

    assert.match(html, /id="language-select"/);
    assert.match(html, /id="download-app-link"/);
    assert.match(html, /data-i18n="download\.app"/);
    assert.match(html, /<option value="zh">ZH<\/option>/);
    assert.match(html, /<option value="en">EN<\/option>/);
    assert.match(html, /data-i18n="brand\.tagline"/);
    assert.match(script, /Everything Markdown/);
    assert.match(script, /Everything to Markdown, locally/);
    assert.doesNotMatch(script, /Wanwu Markdown/);
    assert.match(script, /Personal digital assets/);
    assert.match(script, /Agent-ready Markdown/);
    assert.match(script, /Visual branch reports/);
    assert.match(script, /EverythingMarkdown\/captures/);
    assert.match(script, /Web pages/);
    assert.match(script, /Capture AI chat/);
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
});

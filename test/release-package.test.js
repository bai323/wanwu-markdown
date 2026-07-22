import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('GitHub 发布包装', () => {
  it('提供新人可读的 README、许可、隐私和发布检查清单', async () => {
    const readme = await readFile('README.md', 'utf8');
    const zhReadme = await readFile('README.zh-CN.md', 'utf8');
    const license = await readFile('LICENSE', 'utf8');
    const privacy = await readFile('PRIVACY.md', 'utf8');
    const checklist = await readFile('RELEASE_CHECKLIST.md', 'utf8');

    assert.doesNotMatch(readme, /[\u4e00-\u9fff]/);
    assert.match(readme, /# Everything Markdown/);
    assert.doesNotMatch(readme, /Wanwu Markdown/);
    assert.match(readme, /Everything Markdown/);
    assert.match(readme, /Markdown, visual reports, and agent-ready archives/);
    assert.match(readme, /Turn web pages, AI chats, and browser-plugin conversations into Markdown, visual reports, and structured assets/);
    assert.match(readme, /!\[Everything Markdown product screenshot\]\(docs\/product-screenshot\.png\)/);
    assert.match(readme, /\[Beginner guide\]\(docs\/getting-started\.en\.md\)/);
    assert.match(readme, /\[Real examples\]\(docs\/examples\.en\.md\)/);
    assert.match(readme, /\[Chinese README\]\(README\.zh-CN\.md\)/);
    assert.match(readme, /\[Download the app\]\(https:\/\/github\.com\/bai323\/wanwu-markdown\/releases\/latest\)/);
    assert.match(readme, /First run/);
    assert.match(readme, /Release boundary/);
    assert.match(readme, /Personal digital assets/);
    assert.match(readme, /agent-readable format/);
    assert.match(readme, /visual capture reports/);
    assert.match(readme, /Full-model branch alignment/);
    assert.match(readme, /!\[Real full-model branch alignment report\]\(docs\/cases\/real-model-branch-alignment\.png\)/);

    assert.match(zhReadme, /# 万物 Markdown/);
    assert.match(zhReadme, /把网页、AI 对话和浏览器插件里的内容整理成 Markdown、美观报告和结构化资产/);
    assert.match(zhReadme, /\[新手教程\]\(docs\/getting-started\.zh-CN\.md\)/);
    assert.match(zhReadme, /\[真实使用示例\]\(docs\/examples\.zh-CN\.md\)/);
    assert.match(zhReadme, /\[下载 App\]\(https:\/\/github\.com\/bai323\/wanwu-markdown\/releases\/latest\)/);
    assert.match(zhReadme, /第一次运行/);
    assert.match(zhReadme, /发布边界/);
    assert.match(zhReadme, /沉淀属于自己的数字资产/);
    assert.match(zhReadme, /Agent 优先读取格式/);
    assert.match(zhReadme, /视觉友好的采集报告/);
    assert.match(zhReadme, /全模型分支对齐/);
    assert.match(zhReadme, /!\[真实全模型分支对齐报告\]\(docs\/cases\/real-model-branch-alignment\.png\)/);
    assert.match(license, /MIT License/);
    assert.match(privacy, /本地优先/);
    assert.match(checklist, /第一次发布到 GitHub/);
    await access('docs/product-screenshot.png');
    await access('README.zh-CN.md');
    await access('docs/getting-started.zh-CN.md');
    await access('docs/getting-started.en.md');
    await access('docs/examples.zh-CN.md');
    await access('docs/examples.en.md');
    await access('docs/cases/real-sider-branches.zh-CN.svg');
    await access('docs/cases/real-sider-branches.en.svg');
    await access('docs/cases/real-branch-report.zh-CN.svg');
    await access('docs/cases/real-branch-report.en.svg');
    await access('docs/cases/real-model-branch-alignment.png');
  });

  it('配置 CI 与忽略本地生成材料', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
    const gitignore = await readFile('.gitignore', 'utf8');

    assert.match(workflow, /npm test/);
    assert.match(workflow, /npm run build/);
    assert.match(workflow, /npm run lint/);
    assert.match(gitignore, /captures\//);
    assert.match(gitignore, /Markdown-\*/);
    assert.match(gitignore, /Sider-\*/);
    assert.match(gitignore, /sider-share-\*/);
  });
});

import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('GitHub 发布包装', () => {
  it('提供新人可读的 README、许可、隐私和发布检查清单', async () => {
    const readme = await readFile('README.md', 'utf8');
    const license = await readFile('LICENSE', 'utf8');
    const privacy = await readFile('PRIVACY.md', 'utf8');
    const checklist = await readFile('RELEASE_CHECKLIST.md', 'utf8');

    assert.match(readme, /万物 Markdown/);
    assert.match(readme, /把网页、AI 对话和浏览器插件里的内容整理成 Markdown/);
    assert.match(readme, /Wanwu Markdown/);
    assert.match(readme, /Turn web pages, AI chats, and browser-plugin conversations into Markdown/);
    assert.match(readme, /!\[Wanwu Markdown product screenshot\]\(docs\/product-screenshot\.png\)/);
    assert.match(readme, /第一次运行/);
    assert.match(readme, /First run/);
    assert.match(readme, /发布边界/);
    assert.match(readme, /Release boundary/);
    assert.match(license, /MIT License/);
    assert.match(privacy, /本地优先/);
    assert.match(checklist, /第一次发布到 GitHub/);
    await access('docs/product-screenshot.png');
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

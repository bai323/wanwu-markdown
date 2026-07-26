import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('浏览器扩展包装', () => {
  it('提供 X 和微信公众号文章的统一采集扩展原型', async () => {
    const manifest = JSON.parse(await readFile('extensions/x-collector/manifest.json', 'utf8'));
    const content = await readFile('extensions/x-collector/content.js', 'utf8');
    const popup = await readFile('extensions/x-collector/popup.js', 'utf8');

    assert.equal(manifest.manifest_version, 3);
    assert.match(manifest.name, /Everything Markdown Collector/);
    assert.match(manifest.host_permissions.join('\n'), /https:\/\/x\.com\/\*/);
    assert.match(manifest.host_permissions.join('\n'), /https:\/\/mp\.weixin\.qq\.com\/\*/);
    assert.match(content, /WANWU_EXTRACT_ACTIVE/);
    assert.match(content, /article\[data-testid="tweet"\]/);
    assert.match(content, /mp\\\.weixin\\\.qq\\\.com/);
    assert.match(popup, /\/api\/x\/import/);
    assert.match(popup, /\/api\/capture/);
  });
});

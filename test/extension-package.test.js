import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

describe('浏览器扩展包装', () => {
  it('提供 X 收藏点赞采集扩展原型', async () => {
    const manifest = JSON.parse(await readFile('extensions/x-collector/manifest.json', 'utf8'));
    const content = await readFile('extensions/x-collector/content.js', 'utf8');
    const popup = await readFile('extensions/x-collector/popup.js', 'utf8');

    assert.equal(manifest.manifest_version, 3);
    assert.match(manifest.host_permissions.join('\n'), /https:\/\/x\.com\/\*/);
    assert.match(content, /WANWU_EXTRACT_X/);
    assert.match(content, /article\[data-testid="tweet"\]/);
    assert.match(popup, /\/api\/x\/import/);
  });
});

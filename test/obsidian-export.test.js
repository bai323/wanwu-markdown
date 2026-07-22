import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { exportToObsidian, findObsidianVaults } from '../src/core/obsidian-export.js';

describe('Obsidian 输出', () => {
  it('把当前采集结果写入 Vault，并生成 Markdown、JSONL 和报告副本', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wanwu-obsidian-'));
    const vaultPath = join(root, 'My Vault');
    await exportToObsidian({
      vaultPath,
      folder: 'AI 召回/原始材料',
      markdown: '# 一次 Claude 产品讨论\n\n正文',
      jsonl: '{"block":{"content":"正文"}}\n',
      reportHtml: '<!doctype html><title>报告</title>',
      document: {
        title: '一次 Claude 产品讨论',
        kind: 'conversation',
        adapter: 'claude-chat',
        capturedAt: '2026-07-22T09:00:00.000Z',
        source: { url: 'https://claude.ai/chat/demo' }
      },
      includeDataset: true,
      includeReport: true
    });

    const note = join(vaultPath, 'AI 召回', '原始材料', '一次-Claude-产品讨论.md');
    const noteText = await readFile(note, 'utf8');

    assert.match(noteText, /tags:\n  - wanwu-markdown\n  - conversation/);
    assert.match(noteText, /adapter: claude-chat/);
    assert.match(noteText, /# 一次 Claude 产品讨论/);
    await stat(join(vaultPath, 'AI 召回', '原始材料', '一次-Claude-产品讨论.dataset.jsonl'));
    await stat(join(vaultPath, 'AI 召回', '原始材料', '一次-Claude-产品讨论.branch-report.html'));
  });

  it('扫描本机目录中含 .obsidian 的仓库', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wanwu-vaults-'));
    const vaultPath = join(root, 'Knowledge');
    await exportToObsidian({
      vaultPath,
      markdown: '# Demo',
      document: { title: 'Demo', kind: 'webpage', adapter: 'generic-page', source: {} }
    });

    const vaults = await findObsidianVaults({ roots: [root], maxDepth: 2 });

    assert.deepEqual(vaults, [{ name: 'Knowledge', path: vaultPath }]);
  });
});

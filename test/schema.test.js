import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCaptureDocument,
  documentToJsonl,
  documentToMarkdown,
  normalizeLabel,
  validateCaptureRequest
} from '../src/core/schema.js';

describe('采集文档 schema', () => {
  it('把 AI 对话转换成可读 Markdown，并保留来源、附件、过程和外部链接', () => {
    const doc = createCaptureDocument({
      sourceUrl: 'https://example.com/share/demo',
      title: '一次 AI 产品讨论',
      adapter: 'sider-share',
      kind: 'conversation',
      capturedAt: '2026-06-06T15:00:00.000Z',
      blocks: [
        {
          type: 'message',
          role: 'user',
          contentMarkdown: '为我把这个网页变成 Markdown',
          attachments: [{ type: 'file', name: 'demo.pdf', mimeType: 'application/pdf' }]
        },
        {
          type: 'message',
          role: 'assistant',
          model: 'GPT-5.5 Think',
          contentMarkdown: '可以。核心是 **渲染后抽取**。',
          processMarkdown: '打开真实浏览器\n读取 DOM',
          links: [{ text: '参考资料', href: 'https://example.com/ref' }]
        }
      ]
    });

    const markdown = documentToMarkdown(doc);

    assert.match(markdown, /^# 一次 AI 产品讨论/);
    assert.match(markdown, /来源：https:\/\/example\.com\/share\/demo/);
    assert.match(markdown, /## 1\. 用户/);
    assert.match(markdown, /- 附件：demo\.pdf/);
    assert.match(markdown, /## 2\. 助手（GPT-5\.5 Think）/);
    assert.match(markdown, /<summary>过程 \/ 工具<\/summary>/);
    assert.match(markdown, /\[参考资料\]\(https:\/\/example\.com\/ref\)/);
  });

  it('导出 JSONL 时保留块级标注，供训练、评测和蒸馏使用', () => {
    const doc = createCaptureDocument({
      sourceUrl: 'https://example.com/chat',
      title: '召回方案',
      adapter: 'generic-chat',
      kind: 'conversation',
      blocks: [
        {
          type: 'message',
          role: 'user',
          contentMarkdown: '模拟召回冒险岛老玩家',
          labels: normalizeLabel({
            intent: '用户召回',
            quality: 'gold',
            reusable: true,
            notes: '可作为产品演示样本'
          })
        }
      ]
    });

    const rows = documentToJsonl(doc).trim().split('\n').map((line) => JSON.parse(line));

    assert.equal(rows.length, 1);
    assert.equal(rows[0].source.url, 'https://example.com/chat');
    assert.equal(rows[0].block.role, 'user');
    assert.equal(rows[0].labels.intent, '用户召回');
    assert.equal(rows[0].labels.reusable, true);
  });

  it('校验采集请求，阻止空 URL、非 http 协议和未知适配器', () => {
    assert.equal(validateCaptureRequest({ url: 'https://example.com', adapter: 'auto' }).ok, true);
    assert.equal(validateCaptureRequest({ url: 'file:///etc/passwd', adapter: 'auto' }).ok, false);
    assert.equal(validateCaptureRequest({ url: '', adapter: 'auto' }).ok, false);
    assert.equal(validateCaptureRequest({ url: 'https://example.com', adapter: 'magic' }).ok, false);
  });
});

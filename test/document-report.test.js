import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { documentToHtmlReport } from '../src/core/document-report.js';

describe('网页阅读报告', () => {
  it('为微信公众号文章生成可视化友好的 HTML 报告', () => {
    const html = documentToHtmlReport({
      title: '一篇值得沉淀的文章',
      kind: 'webpage',
      adapter: 'wechat-article',
      capturedAt: '2026-07-26T10:00:00.000Z',
      source: {
        url: 'https://mp.weixin.qq.com/s/demo',
        site: 'mp.weixin.qq.com'
      },
      blocks: [
        {
          id: 'block-1',
          type: 'content',
          title: '正文',
          contentMarkdown: '## 核心观点\n\n这是第一段内容。\n\n- 要点一\n- 要点二',
          metadata: {
            author: '白白',
            publishedAt: '2026-07-26'
          },
          links: [{ text: '参考链接', href: 'https://example.com' }]
        }
      ],
      links: [{ text: '参考链接', href: 'https://example.com' }]
    });

    assert.match(html, /<!doctype html>/);
    assert.match(html, /阅读报告/);
    assert.match(html, /微信公众号文章/);
    assert.match(html, /一篇值得沉淀的文章/);
    assert.match(html, /核心观点/);
    assert.match(html, /AI 评估占位/);
    assert.match(html, /参考链接/);
  });
});

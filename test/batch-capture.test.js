import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggregateBatchCaptureResults, extractHttpUrls } from '../src/core/batch-capture.js';

describe('批量采集', () => {
  it('从微信分享文本中提取并去重公众号链接', () => {
    const urls = extractHttpUrls(`
      文章 A https://mp.weixin.qq.com/s/a1
      文章 B：https://mp.weixin.qq.com/s/b2?scene=1
      重复 https://mp.weixin.qq.com/s/a1
    `);

    assert.deepEqual(urls, ['https://mp.weixin.qq.com/s/a1', 'https://mp.weixin.qq.com/s/b2?scene=1']);
  });

  it('把多篇采集结果汇总成 Markdown 和 HTML 总报告', () => {
    const result = aggregateBatchCaptureResults([
      {
        ok: true,
        url: 'https://mp.weixin.qq.com/s/a1',
        result: {
          document: { title: '第一篇', source: { url: 'https://mp.weixin.qq.com/s/a1' }, kind: 'webpage', adapter: 'wechat-article', blocks: [{ id: 'b1', type: 'content', contentMarkdown: '正文一' }] },
          files: { markdown: '/tmp/a/document.md', report: '/tmp/a/reading-report.html' }
        }
      },
      { ok: false, url: 'https://mp.weixin.qq.com/s/b2', error: '页面未加载' }
    ]);

    assert.match(result.markdown, /批量采集 1\/2/);
    assert.match(result.markdown, /第一篇/);
    assert.match(result.markdown, /页面未加载/);
    assert.match(result.reportHtml, /阅读报告/);
    assert.equal(result.document.kind, 'collection');
    assert.equal(result.document.blocks.length, 2);
  });
});

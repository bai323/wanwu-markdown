import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildXApiUrl,
  exportXCollectionPayload,
  normalizeXPosts
} from '../src/core/x-collection.js';

describe('X 收藏与点赞采集', () => {
  it('把浏览器扩展导出的 X 帖文整理成资产文档', () => {
    const doc = normalizeXPosts({
      source: 'browser-extension',
      collection: 'bookmarks',
      posts: [
        {
          id: '1888888888888888888',
          url: 'https://x.com/example/status/1888888888888888888',
          authorName: 'Example',
          authorHandle: 'example',
          text: 'A useful AI note https://example.com',
          createdAt: '2026-07-26T08:00:00.000Z',
          media: [{ type: 'image', url: 'https://pbs.twimg.com/media/demo.jpg', name: 'demo.jpg' }],
          links: [{ text: 'example.com', href: 'https://example.com' }]
        }
      ]
    });

    assert.equal(doc.kind, 'collection');
    assert.equal(doc.adapter, 'x-bookmarks');
    assert.equal(doc.blocks.length, 1);
    assert.match(doc.blocks[0].contentMarkdown, /@example/);
    assert.equal(doc.blocks[0].attachments[0].type, 'image');
  });

  it('生成 Markdown、HTML 报告和 manifest', async () => {
    const result = await exportXCollectionPayload({
      collection: 'likes',
      posts: [
        {
          id: '1999999999999999999',
          url: 'https://x.com/example/status/1999999999999999999',
          authorName: 'Example',
          authorHandle: 'example',
          text: 'Thread worth saving',
          createdAt: '2026-07-26T09:00:00.000Z'
        }
      ]
    }, { outRoot: '/tmp/wanwu-x-test' });

    assert.match(result.markdown, /X Likes/);
    assert.match(result.reportHtml, /阅读报告/);
    assert.match(result.jsonl, /Thread worth saving/);
    assert.equal(result.manifest.files.report.endsWith('x-report.html'), true);
  });

  it('构造官方 API 的 Likes 与 Bookmarks 同步地址', () => {
    assert.equal(
      buildXApiUrl({ userId: '123', collection: 'bookmarks', maxResults: 20 }).pathname,
      '/2/users/123/bookmarks'
    );
    assert.equal(
      buildXApiUrl({ userId: '123', collection: 'likes', maxResults: 20 }).pathname,
      '/2/users/123/liked_posts'
    );
  });
});

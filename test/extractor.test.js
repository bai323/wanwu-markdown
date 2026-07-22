import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chooseAdapter, sanitizeFilename } from '../src/core/extractors.js';

describe('采集适配器选择', () => {
  it('自动识别 Sider 分享页、通用聊天页和普通网页', () => {
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://sider.ai/zh-CN/share/abc',
        hints: { hasSiderMessages: true }
      }),
      'sider-share'
    );
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://example.com/chat',
        hints: { messageCount: 6 }
      }),
      'generic-chat'
    );
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://example.com/article',
        hints: {}
      }),
      'generic-page'
    );
  });

  it('自动识别公众号、X 文章和主流大模型对话入口', () => {
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://mp.weixin.qq.com/s/example',
        hints: {}
      }),
      'wechat-article'
    );
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://x.com/example/status/1234567890',
        hints: {}
      }),
      'x-article'
    );
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://claude.ai/chat/abc',
        hints: {}
      }),
      'claude-chat'
    );
    assert.equal(
      chooseAdapter({
        requested: 'auto',
        url: 'https://chatgpt.com/c/codex-demo',
        hints: { title: 'Codex 任务' }
      }),
      'codex-chat'
    );
  });

  it('生成安全文件名，避免路径穿越和控制字符', () => {
    assert.equal(sanitizeFilename('../万物 Markdown:?* demo.html'), '万物-Markdown-demo.html');
    assert.equal(sanitizeFilename(''), 'capture');
  });
});

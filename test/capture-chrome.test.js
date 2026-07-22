import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertMeaningfulCapture } from '../src/capture/chrome.js';

describe('浏览器采集结果校验', () => {
  it('私有 AI 对话没有消息时返回明确的登录态提示', () => {
    assert.throws(
      () => assertMeaningfulCapture({ kind: 'conversation', adapter: 'kimi-chat', blocks: [] }),
      /私有对话通常需要登录态/
    );
  });

  it('普通网页允许空内容继续走兜底报告', () => {
    assert.doesNotThrow(() => assertMeaningfulCapture({ kind: 'webpage', adapter: 'generic-page', blocks: [] }));
  });
});

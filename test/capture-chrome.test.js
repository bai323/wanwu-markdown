import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertMeaningfulCapture, liveCaptureProfileDir, shouldRemoveProfile } from '../src/capture/chrome.js';

describe('浏览器采集结果校验', () => {
  it('私有 AI 对话没有消息时返回明确的登录态提示', () => {
    assert.throws(
      () => assertMeaningfulCapture({ kind: 'conversation', adapter: 'kimi-chat', blocks: [] }),
      /万物专用采集窗口登录/
    );
  });

  it('普通网页允许空内容继续走兜底报告', () => {
    assert.doesNotThrow(() => assertMeaningfulCapture({ kind: 'webpage', adapter: 'generic-page', blocks: [] }));
  });

  it('实时采集使用持久 profile 保留登录态', () => {
    assert.match(liveCaptureProfileDir(), /WanwuMarkdown.*browser-profile/);
    assert.equal(shouldRemoveProfile({ persistentProfile: true }), false);
    assert.equal(shouldRemoveProfile({ persistentProfile: false }), true);
    assert.equal(shouldRemoveProfile({}), true);
  });
});

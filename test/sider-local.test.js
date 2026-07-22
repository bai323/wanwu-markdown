import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeStoredJson, inspectSiderEntries, selectSiderChat } from '../src/importers/sider-local.js';

describe('Sider 本地存储解析', () => {
  it('解析 Chrome LevelDB 中的普通 JSON 和带前缀 JSON', () => {
    assert.deepEqual(decodeStoredJson(Buffer.from('{"currentChatId":"chat-1"}')), { currentChatId: 'chat-1' });
    assert.deepEqual(decodeStoredJson(Buffer.concat([Buffer.from([1]), Buffer.from('{"id":"chat-2"}')])), { id: 'chat-2' });
  });

  it('优先使用指定会话，否则读取 chatTempData 的当前会话', () => {
    const entries = new Map([
      ['chatTempData', Buffer.from('{"currentChatId":"chat-current"}')],
      ['chat:messages:chat-current', Buffer.from('{"id":"chat-current","messages":[]}')],
      ['chat:messages:chat-other', Buffer.from('{"id":"chat-other","messages":[]}')]
    ]);

    assert.equal(selectSiderChat(entries).chat.id, 'chat-current');
    assert.equal(selectSiderChat(entries, 'chat-other').chat.id, 'chat-other');
    assert.throws(() => selectSiderChat(entries, 'missing'), /没有找到 Sider 会话/);
  });

  it('列出当前和最近会话，让用户按标题确认目标对话', () => {
    const entries = new Map([
      ['chatTempData', Buffer.from('{"currentChatId":"chat-current"}')],
      ['chat:messages:chat-old', Buffer.from('{"id":"chat-old","title":"旧对话","updatedAt":"2026-06-09T10:00:00.000Z","messages":[{"id":"1"}]}')],
      ['chat:messages:chat-current', Buffer.from('{"id":"chat-current","title":"需要恢复的产品讨论","updatedAt":"2026-06-11T08:00:00.000Z","messages":[{"id":"1"},{"id":"2"}]}')]
    ]);

    const inspection = inspectSiderEntries(entries);

    assert.equal(inspection.currentChatId, 'chat-current');
    assert.equal(inspection.current.title, '需要恢复的产品讨论');
    assert.equal(inspection.current.messageCount, 2);
    assert.equal(inspection.chats[0].id, 'chat-current');
    assert.equal(inspection.chats[0].isCurrent, true);
    assert.equal(inspection.chats[1].title, '旧对话');
  });
});

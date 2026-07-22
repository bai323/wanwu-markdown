import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  conversationGraphToCaptureDocument,
  conversationGraphToMarkdown,
  normalizeConversationGraph
} from '../src/core/conversation-graph.js';
import { conversationGraphToHtml } from '../src/core/conversation-report.js';

const samplePayload = {
  id: 'chat-demo',
  title: '多模型产品讨论',
  currentLeafMessageId: 'a2',
  messages: [
    {
      id: 'u1',
      parentMessageId: 'root',
      currentChildId: 'a1',
      role: 'user',
      model: 'gpt-5.4-think',
      createdAt: '2026-06-10T10:00:00.000Z',
      content: '请评估这个产品。'
    },
    {
      id: 'a1',
      parentMessageId: 'u1',
      currentChildId: 'u2',
      role: 'assistant',
      model: 'claude-opus-4.6',
      content: [
        { type: 'reasoning_content', text: '先比较市场与产品。' },
        { type: 'text', text: '第一版结论。' }
      ]
    },
    {
      id: 'a1-alt',
      parentMessageId: 'u1',
      role: 'assistant',
      model: 'gemini-3.5-flash',
      content: '另一条回答。'
    },
    {
      id: 'u2',
      parentMessageId: 'a1',
      currentChildId: 'a2',
      role: 'user',
      content: '继续。'
    },
    {
      id: 'a2',
      parentMessageId: 'u2',
      role: 'assistant',
      model: 'gpt-5.5',
      content: '最终结论。'
    }
  ]
};

describe('对话图归一化', () => {
  it('从当前叶子恢复主分支，并识别同一父消息下的替代分支', () => {
    const graph = normalizeConversationGraph(samplePayload, { adapter: 'sider-local' });

    assert.deepEqual(graph.activePathIds, ['u1', 'a1', 'u2', 'a2']);
    assert.equal(graph.stats.messageCount, 5);
    assert.equal(graph.stats.activeMessageCount, 4);
    assert.equal(graph.stats.branchMessageCount, 1);
    assert.equal(graph.stats.branchPointCount, 1);
    assert.deepEqual(graph.branchPoints[0].childIds, ['a1', 'a1-alt']);
    assert.equal(graph.branchPoints[0].activeChildId, 'a1');
    assert.equal(graph.messages.find((message) => message.id === 'a1').processMarkdown, '先比较市场与产品。');
    assert.equal(graph.messages.find((message) => message.id === 'a1').contentMarkdown, '第一版结论。');
  });

  it('兼容分享页导出的扁平消息，并生成稳定的父子链', () => {
    const graph = normalizeConversationGraph({
      pageTitle: '分享页对话',
      sourceUrl: 'https://sider.ai/zh-CN/share/demo',
      messages: [
        { index: 1, role: '用户', content: '问题' },
        { index: 2, role: '助手', model: 'GPT-5.5 Think', content: '回答' }
      ]
    });

    assert.equal(graph.title, '分享页对话');
    assert.deepEqual(graph.activePathIds, ['message-1', 'message-2']);
    assert.equal(graph.messages[1].parentId, 'message-1');
    assert.equal(graph.messages[1].model, 'GPT-5.5 Think');
  });

  it('解析 Sider 本地 multiContent 的思考、工具、文件和错误', () => {
    const graph = normalizeConversationGraph({
      currentLeafMessageId: 'm1',
      messages: [
        {
          id: 'm1',
          parentMessageId: 'root',
          role: 'assistant',
          model: 'claude-sonnet-4.6',
          multiContent: [
            { type: 'reasoning_content', reasoningContent: { status: 'finish', text: '内部分析' } },
            { type: 'tool_call', toolCall: { name: 'search', arguments: '{"q":"demo"}', status: 'finish' } },
            { type: 'text', text: '对用户可见的回答' },
            { type: 'file', file: { fileName: '图.png', mimetype: 'image/png', url: 'https://example.com/a.png' } },
            { type: 'error', error: { code: 500, message: 'Internal Server Error' } }
          ]
        }
      ]
    });

    const message = graph.messages[0];
    assert.equal(message.contentMarkdown, '对用户可见的回答');
    assert.match(message.processMarkdown, /内部分析/);
    assert.match(message.processMarkdown, /工具调用：search/);
    assert.match(message.processMarkdown, /Internal Server Error/);
    assert.equal(message.attachments[0].name, '图.png');
    assert.equal(message.attachments[0].type, 'image');
  });
});

describe('分支材料导出', () => {
  it('Markdown 明确展示主分支、分叉点、替代回答和模型', () => {
    const graph = normalizeConversationGraph(samplePayload, { adapter: 'sider-local' });
    const markdown = conversationGraphToMarkdown(graph);

    assert.match(markdown, /## 当前主分支/);
    assert.match(markdown, /Claude Opus 4\.6|claude-opus-4\.6/i);
    assert.match(markdown, /## 分支对比/);
    assert.match(markdown, /Gemini 3\.5 Flash|gemini-3\.5-flash/i);
    assert.match(markdown, /另一条回答/);
    assert.match(markdown, /父消息：`u1`/);
  });

  it('统一文档保留每条消息的分支和模型元数据', () => {
    const graph = normalizeConversationGraph(samplePayload, { adapter: 'sider-local' });
    const doc = conversationGraphToCaptureDocument(graph);

    assert.equal(doc.kind, 'conversation');
    assert.equal(doc.blocks.length, 5);
    assert.equal(doc.blocks.find((block) => block.id === 'a1-alt').metadata.isActive, false);
    assert.equal(doc.blocks.find((block) => block.id === 'a1-alt').model, 'gemini-3.5-flash');
  });

  it('HTML 报告包含模型图例、分支选择器和可比较消息列', () => {
    const graph = normalizeConversationGraph(samplePayload, { adapter: 'sider-local' });
    const html = conversationGraphToHtml(graph);

    assert.match(html, /多模型产品讨论/);
    assert.match(html, /模型图例/);
    assert.match(html, /data-branch-point="u1"/);
    assert.match(html, /claude-opus-4\.6/);
    assert.match(html, /gemini-3\.5-flash/);
    assert.match(html, /另一条回答/);
  });
});

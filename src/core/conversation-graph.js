import { createCaptureDocument } from './schema.js';

const PROCESS_TYPES = new Set(['reasoning', 'reasoning_content', 'tool_call', 'tool_result', 'error']);
const ROOT_IDS = new Set(['', 'root', 'null', 'undefined']);

export function normalizeConversationGraph(payload = {}, options = {}) {
  const source = unwrapPayload(payload);
  const rawMessages = Array.isArray(source.messages) ? source.messages : [];
  const flatMode = rawMessages.length > 0 && !rawMessages.some(hasGraphRelationship);
  const messages = rawMessages.map((message, index) => normalizeMessage(message, index, rawMessages, flatMode));
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  const childrenByParent = buildChildrenMap(messages, messageMap);
  const currentLeafMessageId = selectCurrentLeaf(source, messages, messageMap, childrenByParent, flatMode);
  const activePathIds = recoverActivePath(currentLeafMessageId, messageMap);
  const activeSet = new Set(activePathIds);

  for (const message of messages) {
    message.isActive = activeSet.has(message.id);
    message.childIds = childrenByParent.get(message.id) || [];
  }

  const branchPoints = [];
  for (const [parentId, childIds] of childrenByParent.entries()) {
    if (ROOT_IDS.has(String(parentId)) || childIds.length < 2) continue;
    const parent = messageMap.get(parentId);
    branchPoints.push({
      parentId,
      childIds,
      activeChildId: childIds.find((id) => activeSet.has(id)) || parent?.currentChildId || '',
      depth: activePathIds.indexOf(parentId),
      parentPreview: preview(parent?.contentMarkdown || '')
    });
  }

  branchPoints.sort((left, right) => {
    const leftDepth = left.depth < 0 ? Number.MAX_SAFE_INTEGER : left.depth;
    const rightDepth = right.depth < 0 ? Number.MAX_SAFE_INTEGER : right.depth;
    return leftDepth - rightDepth || left.parentId.localeCompare(right.parentId);
  });

  const models = countValues(messages.map((message) => message.model).filter(Boolean));
  const roles = countValues(messages.map((message) => message.role).filter(Boolean));
  const title = source.title || source.pageTitle || source.chatTitle || firstUserPreview(messages) || '未命名对话';
  const sourceUrl = source.sourceUrl || source.url || source.source?.url || options.sourceUrl || '';

  return {
    version: '0.1',
    kind: 'conversation-graph',
    id: String(source.id || source.chatId || options.chatId || ''),
    title,
    adapter: options.adapter || source.adapter || inferAdapter(sourceUrl),
    capturedAt: options.capturedAt || new Date().toISOString(),
    createdAt: normalizeDate(source.createdAt || source.createTime || source.created_time),
    updatedAt: normalizeDate(source.updatedAt || source.updateTime || source.updated_time),
    source: {
      url: sourceUrl,
      site: safeHostname(sourceUrl),
      profile: options.profile || source.source?.profile || ''
    },
    currentLeafMessageId,
    activePathIds,
    branchPoints,
    messages,
    stats: {
      messageCount: messages.length,
      activeMessageCount: activePathIds.length,
      branchMessageCount: Math.max(0, messages.length - activePathIds.length),
      branchPointCount: branchPoints.length,
      textCharacterCount: messages.reduce(
        (sum, message) => sum + message.contentMarkdown.length + message.processMarkdown.length,
        0
      ),
      models,
      roles
    },
    metadata: {
      ...(source.metadata || {}),
      inputShape: flatMode ? 'flat' : 'graph'
    }
  };
}

export function conversationGraphToCaptureDocument(graph) {
  return createCaptureDocument({
    sourceUrl: graph.source?.url || '',
    title: graph.title,
    adapter: graph.adapter || 'generic-chat',
    kind: 'conversation',
    capturedAt: graph.capturedAt,
    metadata: {
      conversationId: graph.id,
      currentLeafMessageId: graph.currentLeafMessageId,
      activePathIds: graph.activePathIds,
      branchPoints: graph.branchPoints,
      stats: graph.stats
    },
    blocks: graph.messages.map((message) => ({
      id: message.id,
      type: 'message',
      role: message.role,
      model: message.model,
      contentMarkdown: message.contentMarkdown || '(空消息)',
      processMarkdown: message.processMarkdown,
      attachments: message.attachments,
      links: message.links,
      metadata: {
        parentId: message.parentId,
        currentChildId: message.currentChildId,
        childIds: message.childIds,
        createdAt: message.createdAt,
        isActive: message.isActive,
        branchDepth: message.branchDepth
      }
    }))
  });
}

export function conversationGraphToMarkdown(graph) {
  const lines = [
    `# ${graph.title}`,
    '',
    '## 导出信息',
    '',
    `- 会话 ID：\`${graph.id || '未知'}\``,
    graph.source?.url ? `- 来源：${graph.source.url}` : '',
    `- 导出时间：${graph.capturedAt}`,
    `- 消息总数：${graph.stats.messageCount}`,
    `- 当前主分支消息：${graph.stats.activeMessageCount}`,
    `- 其他分支消息：${graph.stats.branchMessageCount}`,
    `- 分叉点：${graph.stats.branchPointCount}`,
    `- 模型分布：${formatCounts(graph.stats.models) || '未识别'}`,
    '',
    '---',
    '',
    '## 当前主分支',
    ''
  ].filter((line) => line !== '');

  const messageMap = new Map(graph.messages.map((message) => [message.id, message]));
  graph.activePathIds.forEach((id, index) => {
    const message = messageMap.get(id);
    if (message) appendMessage(lines, message, index + 1, true);
  });

  lines.push('', '---', '', '## 分支对比', '');
  if (!graph.branchPoints.length) {
    lines.push('本次对话没有检测到分叉。');
  }

  graph.branchPoints.forEach((point, pointIndex) => {
    const parent = messageMap.get(point.parentId);
    lines.push(`### 分叉 ${pointIndex + 1}：${point.parentPreview || '未命名分叉'}`);
    lines.push('');
    lines.push(`- 父消息：\`${point.parentId}\``);
    lines.push(`- 子分支数量：${point.childIds.length}`);
    lines.push(`- 当前选择：\`${point.activeChildId || '无'}\``);
    lines.push('');

    point.childIds.forEach((childId, childIndex) => {
      const child = messageMap.get(childId);
      if (!child) return;
      const status = childId === point.activeChildId ? '当前分支' : '替代分支';
      lines.push(`#### ${childIndex + 1}. ${status} · ${roleLabel(child.role)}${child.model ? `（${child.model}）` : ''}`);
      lines.push('');
      lines.push(`- 消息 ID：\`${child.id}\``);
      lines.push(`- 父消息：\`${child.parentId || 'root'}\``);
      if (child.createdAt) lines.push(`- 时间：${child.createdAt}`);
      lines.push('');
      if (child.processMarkdown) appendDetails(lines, '思考 / 工具过程', child.processMarkdown);
      lines.push(child.contentMarkdown || '(空消息)', '');
    });

    if (parent?.contentMarkdown) {
      lines.push('<details>', '<summary>分叉前上下文</summary>', '', parent.contentMarkdown, '', '</details>', '');
    }
  });

  lines.push('---', '', '## 全量消息索引', '');
  graph.messages.forEach((message, index) => {
    const status = message.isActive ? '主分支' : '其他分支';
    lines.push(
      `${index + 1}. **${roleLabel(message.role)}${message.model ? ` · ${message.model}` : ''}** · ${status} · \`${message.id}\` → 父 \`${message.parentId || 'root'}\``
    );
  });

  return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

export function modelDisplayName(model = '') {
  if (!model) return '未知模型';
  return String(model)
    .replace(/[-_]+/g, ' ')
    .replace(/\b(gpt|glm|ai)\b/gi, (value) => value.toUpperCase())
    .replace(/\b\w/g, (value) => value.toUpperCase())
    .replace(/\bThink\b/i, 'Think');
}

function normalizeMessage(message = {}, index, allMessages, flatMode) {
  const id = String(message.id || message.messageId || message.message_id || `message-${index + 1}`);
  const previous = allMessages[index - 1];
  const parentId = flatMode
    ? index === 0
      ? 'root'
      : String(previous?.id || previous?.messageId || previous?.message_id || `message-${index}`)
    : normalizeParentId(message.parentId ?? message.parentMessageId ?? message.parent_message_id);
  const parts = extractMessageParts(message);

  return {
    id,
    parentId,
    currentChildId: String(message.currentChildId || message.current_child_id || ''),
    childIds: [],
    role: normalizeRole(message.role || message.author?.role || message.sender || ''),
    model: String(message.model || message.modelName || message.model_name || message.metadata?.model || ''),
    createdAt: normalizeDate(message.createdAt || message.createTime || message.created_time || message.timestamp),
    contentMarkdown: parts.contentMarkdown,
    processMarkdown: parts.processMarkdown,
    attachments: normalizeAttachments(message.attachments, parts.attachments),
    links: normalizeLinks(message.links),
    isActive: false,
    branchDepth: Number(message.branchDepth || 0),
    metadata: message.metadata || {}
  };
}

function extractMessageParts(message) {
  const source = message.multiContent ?? message.content ?? message.contents ?? message.parts ?? message.text ?? message.body ?? '';
  const items = Array.isArray(source) ? source : [source];
  const content = [];
  const process = [];
  const attachments = [];

  for (const item of items) {
    if (typeof item === 'string' || typeof item === 'number') {
      content.push(String(item));
      continue;
    }
    if (!item || typeof item !== 'object') continue;

    const type = String(item.type || item.contentType || item.kind || '').toLowerCase();
    if (type === 'file' || type === 'image' || item.file || item.url && item.mimeType) {
      attachments.push(normalizeAttachment(item.file || item));
      continue;
    }

    if (type === 'reasoning' || type === 'reasoning_content') {
      const reasoning = item.reasoningContent || item.reasoning_content || item;
      const text = typeof reasoning === 'object' ? reasoning.text || toText(reasoning) : toText(reasoning);
      if (text) process.push(text);
      continue;
    }

    if (type === 'tool_call') {
      const tool = item.toolCall || item.tool_call || item;
      const details = [
        tool.status ? `状态：${tool.status}` : '',
        tool.arguments ? `参数：\n${tool.arguments}` : '',
        tool.result ? `结果：\n${toText(tool.result)}` : ''
      ].filter(Boolean).join('\n\n');
      process.push(`### 工具调用${tool.name ? `：${tool.name}` : ''}\n\n${details || toText(tool)}`);
      continue;
    }

    if (type === 'error') {
      const failure = item.error || item;
      process.push(`### 错误\n\n${failure.code ? `${failure.code} · ` : ''}${failure.message || toText(failure)}`);
      continue;
    }

    const text = extractText(item);
    if (!text) continue;
    if (PROCESS_TYPES.has(type)) process.push(formatProcessPart(type, text, item));
    else content.push(text);
  }

  if (!content.length) {
    const fallback = extractText(message);
    if (fallback && fallback !== String(message.role || '')) content.push(fallback);
  }

  const explicitProcess = message.process || message.processMarkdown || message.reasoning || '';
  if (explicitProcess) process.unshift(toText(explicitProcess));

  return {
    contentMarkdown: clean(content.join('\n\n')),
    processMarkdown: clean(process.join('\n\n')),
    attachments: attachments.filter(Boolean)
  };
}

function extractText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  const candidates = [
    value.text,
    value.content,
    value.reasoningContent,
    value.reasoning_content,
    value.toolCall,
    value.tool_call,
    value.result,
    value.output,
    value.message,
    value.error
  ];
  for (const candidate of candidates) {
    const text = toText(candidate);
    if (text) return text;
  }
  return '';
}

function toText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value) return '';
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return '';
}

function formatProcessPart(type, text, item) {
  if (type === 'reasoning' || type === 'reasoning_content') return text;
  const toolName = item.name || item.toolCall?.name || item.tool_call?.name || '';
  const label = type === 'tool_call' ? `工具调用${toolName ? `：${toolName}` : ''}` : type === 'error' ? '错误' : '工具结果';
  return `### ${label}\n\n${text}`;
}

function buildChildrenMap(messages, messageMap) {
  const children = new Map();
  for (const message of messages) {
    const parentId = message.parentId;
    if (!messageMap.has(parentId)) continue;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(message.id);
  }
  return children;
}

function selectCurrentLeaf(source, messages, messageMap, childrenByParent, flatMode) {
  const explicit = String(
    source.currentLeafMessageId || source.current_leaf_message_id || source.currentMessageId || source.leafMessageId || ''
  );
  if (messageMap.has(explicit)) return explicit;
  if (flatMode) return messages.at(-1)?.id || '';

  const currentChildIds = new Set(messages.map((message) => message.currentChildId).filter((id) => messageMap.has(id)));
  const preferredLeaves = messages.filter(
    (message) => !childrenByParent.get(message.id)?.length && (currentChildIds.has(message.id) || message.currentChildId === '')
  );
  return preferredLeaves.at(-1)?.id || messages.at(-1)?.id || '';
}

function recoverActivePath(leafId, messageMap) {
  const path = [];
  const seen = new Set();
  let currentId = leafId;

  while (messageMap.has(currentId) && !seen.has(currentId)) {
    seen.add(currentId);
    path.push(currentId);
    const parentId = messageMap.get(currentId).parentId;
    if (!messageMap.has(parentId)) break;
    currentId = parentId;
  }

  return path.reverse();
}

function appendMessage(lines, message, index, active) {
  lines.push(`### ${index}. ${roleLabel(message.role)}${message.model ? `（${message.model}）` : ''}`);
  lines.push('');
  lines.push('<details>', '<summary>消息元数据</summary>', '');
  if (message.createdAt) lines.push(`- 时间：${message.createdAt}`);
  lines.push(`- 消息 ID：\`${message.id}\``);
  lines.push(`- 父消息：\`${message.parentId || 'root'}\``);
  if (message.currentChildId) lines.push(`- 当前子消息：\`${message.currentChildId}\``);
  lines.push(`- 当前主分支：${active ? '是' : '否'}`, '', '</details>', '');
  if (message.processMarkdown) appendDetails(lines, '思考 / 工具过程', message.processMarkdown);
  lines.push(message.contentMarkdown || '(空消息)', '');
}

function appendDetails(lines, summary, content) {
  lines.push('<details>', `<summary>${summary}</summary>`, '', fence(content), '', '</details>', '');
}

function fence(value) {
  const maxTicks = (String(value).match(/`{3,}/g) || []).reduce((max, ticks) => Math.max(max, ticks.length), 3);
  const marker = '`'.repeat(maxTicks + 1);
  return `${marker}text\n${value}\n${marker}`;
}

function unwrapPayload(payload) {
  if (payload?.graph?.messages) return payload.graph;
  if (payload?.chat?.messages) return payload.chat;
  if (payload?.data?.messages) return payload.data;
  if (payload?.conversation?.messages) return payload.conversation;
  return payload || {};
}

function hasGraphRelationship(message = {}) {
  return Boolean(
    message.parentId ||
      message.parentMessageId ||
      message.parent_message_id ||
      message.currentChildId ||
      message.current_child_id
  );
}

function normalizeParentId(value) {
  const parent = String(value ?? 'root');
  return ROOT_IDS.has(parent) ? 'root' : parent;
}

function normalizeRole(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === '用户' || /user|human|request/.test(normalized)) return 'user';
  if (normalized === '助手' || /assistant|model|answer|response|ai/.test(normalized)) return 'assistant';
  if (/system/.test(normalized)) return 'system';
  if (/tool/.test(normalized)) return 'tool';
  return normalized || 'unknown';
}

function roleLabel(role) {
  if (role === 'user') return '用户';
  if (role === 'assistant') return '助手';
  if (role === 'system') return '系统';
  if (role === 'tool') return '工具';
  return role || '消息';
}

function normalizeAttachments(explicit, extracted) {
  const result = [];
  const source = Array.isArray(explicit)
    ? explicit
    : explicit && typeof explicit === 'object'
      ? [...(explicit.files || []), ...(explicit.images || [])]
      : [];
  for (const item of [...source, ...extracted]) {
    const attachment = normalizeAttachment(item);
    if (attachment) result.push(attachment);
  }
  return result;
}

function normalizeAttachment(item) {
  if (!item) return null;
  if (typeof item === 'string') return { type: 'file', name: item, url: '', localPath: '', mimeType: '' };
  return {
    type: item.type === 'image' || String(item.mimeType || item.mimetype || '').startsWith('image/') ? 'image' : 'file',
    name: String(item.name || item.fileName || item.filename || item.title || ''),
    url: String(item.url || item.src || item.downloadUrl || ''),
    localPath: String(item.localPath || ''),
    mimeType: String(item.mimeType || item.mime_type || item.mimetype || ''),
    width: Number(item.width || 0),
    height: Number(item.height || 0)
  };
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => (typeof link === 'string' ? { text: link, href: link } : link))
    .filter((link) => link?.href)
    .map((link) => ({ text: String(link.text || link.href), href: String(link.href) }));
}

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function countValues(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function formatCounts(counts = {}) {
  return Object.entries(counts)
    .map(([key, count]) => `${key} × ${count}`)
    .join('、');
}

function firstUserPreview(messages) {
  return preview(messages.find((message) => message.role === 'user')?.contentMarkdown || '');
}

function preview(value, length = 72) {
  const text = clean(value).replace(/[#>*_`|\[\]]/g, '').replace(/\s+/g, ' ');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function clean(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function inferAdapter(sourceUrl) {
  return /sider\.ai/i.test(sourceUrl) ? 'sider-share' : 'generic-chat';
}

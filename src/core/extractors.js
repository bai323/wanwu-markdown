export const ADAPTERS = [
  'auto',
  'generic-page',
  'generic-chat',
  'sider-share',
  'wechat-article',
  'x-article',
  'claude-chat',
  'codex-chat',
  'chatgpt-chat',
  'gemini-chat',
  'kimi-chat',
  'generic-llm-chat'
];

export function chooseAdapter({ requested = 'auto', url = '', hints = {} } = {}) {
  if (requested && requested !== 'auto') {
    return requested;
  }

  const normalizedUrl = String(url || '').toLowerCase();
  const title = String(hints.title || '').toLowerCase();

  if (hints.hasSiderMessages || /sider\.ai\/.*\/share\//i.test(normalizedUrl)) {
    return 'sider-share';
  }

  if (/mp\.weixin\.qq\.com\/s/i.test(normalizedUrl)) {
    return 'wechat-article';
  }

  if (/(^https?:\/\/)?(www\.)?(x|twitter)\.com\/.+\/status\/\d+/i.test(normalizedUrl) || /x\.com\/i\/article\//i.test(normalizedUrl)) {
    return 'x-article';
  }

  if (/claude\.ai\/(chat|project|new)/i.test(normalizedUrl) || hints.hasClaudeMessages) {
    return 'claude-chat';
  }

  if (/(chatgpt\.com|chat\.openai\.com)/i.test(normalizedUrl) && (title.includes('codex') || /\/codex\b/i.test(normalizedUrl))) {
    return 'codex-chat';
  }

  if (/(chatgpt\.com|chat\.openai\.com)/i.test(normalizedUrl) || hints.hasChatGptMessages) {
    return 'chatgpt-chat';
  }

  if (/gemini\.google\.com/i.test(normalizedUrl) || hints.hasGeminiMessages) {
    return 'gemini-chat';
  }

  if (/kimi\.com\/chat\//i.test(normalizedUrl) || hints.hasKimiMessages) {
    return 'kimi-chat';
  }

  if ((hints.messageCount || 0) >= 2 || hints.hasChatLikeStructure) {
    return 'generic-chat';
  }

  return 'generic-page';
}

export function sanitizeFilename(value, fallback = 'capture') {
  const safe = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\.+/g, '.')
    .replace(/(^|[\s-])\.+(?=[\s-]|$)/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '');

  return safe || fallback;
}

export function inferKind(adapter) {
  return ['sider-share', 'generic-chat', 'claude-chat', 'codex-chat', 'chatgpt-chat', 'gemini-chat', 'kimi-chat', 'generic-llm-chat'].includes(adapter)
    ? 'conversation'
    : 'webpage';
}

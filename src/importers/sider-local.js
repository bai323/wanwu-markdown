import { cp, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { ClassicLevel } from 'classic-level';

import { exportConversationPayload } from '../core/conversation-export.js';

const SIDER_EXTENSION_ID = 'difoiogjjojoaoomphldepapgpbgkhkb';
const CHROME_ROOT = join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');

export async function listSiderProfiles(options = {}) {
  const chromeRoot = options.chromeRoot || CHROME_ROOT;
  let entries;
  try {
    entries = await readdir(chromeRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const profiles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const storagePath = siderStoragePath(chromeRoot, entry.name);
    if (await isDirectory(storagePath)) {
      profiles.push({
        id: entry.name,
        label: entry.name === 'Default' ? '默认配置' : entry.name,
        storagePath
      });
    }
  }

  return profiles.sort((left, right) => {
    if (left.id === 'Default') return -1;
    if (right.id === 'Default') return 1;
    return left.id.localeCompare(right.id);
  });
}

export async function recoverSiderConversation(options = {}) {
  const chromeRoot = options.chromeRoot || CHROME_ROOT;
  const profiles = await listSiderProfiles({ chromeRoot });
  const profile = options.profile || profiles[0]?.id;
  const selected = profiles.find((item) => item.id === profile);
  if (!selected) {
    const error = new Error(`没有找到 Chrome 配置：${profile || '未指定'}`);
    error.statusCode = 404;
    throw error;
  }

  const snapshotDir = await mkdtemp(join(tmpdir(), 'wanwu-sider-'));
  try {
    await cp(selected.storagePath, snapshotDir, { recursive: true, force: true });
    const entries = await readSiderEntries(snapshotDir);
    const { chatId, chat } = selectSiderChat(entries, options.chatId);
    return exportConversationPayload(chat, {
      adapter: 'sider-local',
      profile,
      chatId,
      outRoot: options.outRoot
    });
  } finally {
    await rm(snapshotDir, { recursive: true, force: true });
  }
}

export async function inspectSiderConversations(options = {}) {
  const chromeRoot = options.chromeRoot || CHROME_ROOT;
  const profiles = await listSiderProfiles({ chromeRoot });
  const profile = options.profile || profiles[0]?.id;
  const selected = profiles.find((item) => item.id === profile);
  if (!selected) {
    const error = new Error(`没有找到 Chrome 配置：${profile || '未指定'}`);
    error.statusCode = 404;
    throw error;
  }

  const snapshotDir = await mkdtemp(join(tmpdir(), 'wanwu-sider-inspect-'));
  try {
    await cp(selected.storagePath, snapshotDir, { recursive: true, force: true });
    const entries = await readSiderEntries(snapshotDir);
    return {
      profile,
      ...inspectSiderEntries(entries, options.limit)
    };
  } finally {
    await rm(snapshotDir, { recursive: true, force: true });
  }
}

export function selectSiderChat(entries, requestedChatId = '') {
  const temporary = entries.has('chatTempData') ? decodeStoredJson(entries.get('chatTempData')) : {};
  const chatId = requestedChatId || temporary.currentChatId || temporary.chatId || '';
  const key = chatId ? `chat:messages:${chatId}` : '';
  if (!key || !entries.has(key)) {
    const error = new Error(`没有找到 Sider 会话：${chatId || '当前会话未知'}`);
    error.statusCode = 404;
    throw error;
  }

  const chat = decodeStoredJson(entries.get(key));
  return { chatId, chat };
}

export function inspectSiderEntries(entries, limit = 30) {
  const temporary = entries.has('chatTempData') ? decodeStoredJson(entries.get('chatTempData')) : {};
  const currentChatId = temporary.currentChatId || temporary.chatId || '';
  const chats = [];

  for (const [key, value] of entries) {
    if (!key.startsWith('chat:messages:')) continue;
    try {
      const chat = decodeStoredJson(value);
      const id = String(chat.id || key.slice('chat:messages:'.length));
      chats.push({
        id,
        title: chatTitle(chat),
        messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
        updatedAt: normalizeTimestamp(chat.updatedAt || chat.updateAt || chat.createAt || chat.createdAt),
        isCurrent: id === currentChatId
      });
    } catch {
      // 单条损坏会话不应阻断其他可恢复会话的识别。
    }
  }

  chats.sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
    return String(right.updatedAt).localeCompare(String(left.updatedAt));
  });

  const limitedChats = chats.slice(0, Math.max(1, Number(limit) || 30));
  return {
    currentChatId,
    current: limitedChats.find((chat) => chat.id === currentChatId) || null,
    chats: limitedChats
  };
}

export function decodeStoredJson(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value || ''));
  const text = buffer.toString('utf8');
  const starts = [text.indexOf('{'), text.indexOf('['), text.indexOf('"')].filter((index) => index >= 0);
  const start = starts.length ? Math.min(...starts) : 0;
  try {
    return JSON.parse(text.slice(start));
  } catch (cause) {
    const error = new Error('Sider 本地数据不是有效 JSON');
    error.cause = cause;
    throw error;
  }
}

async function readSiderEntries(snapshotDir) {
  const db = new ClassicLevel(snapshotDir, { keyEncoding: 'utf8', valueEncoding: 'buffer' });
  const entries = new Map();
  await db.open();
  try {
    for await (const [key, value] of db.iterator()) {
      if (key === 'chatTempData' || key.startsWith('chat:messages:')) {
        entries.set(key, value);
      }
    }
  } finally {
    await db.close();
  }
  return entries;
}

function siderStoragePath(chromeRoot, profile) {
  return join(chromeRoot, profile, 'Local Extension Settings', SIDER_EXTENSION_ID);
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function chatTitle(chat) {
  const explicit = String(chat.title || chat.name || '').trim();
  if (explicit) return explicit;
  const firstMessage = Array.isArray(chat.messages) ? chat.messages[0] : null;
  const parts = firstMessage?.multiContent || firstMessage?.content || [];
  const list = Array.isArray(parts) ? parts : [parts];
  const text = list
    .map((part) => typeof part === 'string' ? part : part?.text || part?.userInputText || '')
    .find(Boolean);
  return String(text || chat.description || '未命名对话').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function normalizeTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

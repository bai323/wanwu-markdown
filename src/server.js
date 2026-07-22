import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { captureLiveSession, captureUrl, closeLiveCaptureSession, openLiveCaptureSession } from './capture/chrome.js';
import { exportConversationPayload } from './core/conversation-export.js';
import { exportToObsidian, findObsidianVaults } from './core/obsidian-export.js';
import { inspectSiderConversations, listSiderProfiles, recoverSiderConversation } from './importers/sider-local.js';

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = resolve('public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/capture') {
      const payload = await readJsonBody(req);
      const result = await captureUrl(payload);
      return sendJson(res, 200, result);
    }

    if (req.method === 'GET' && req.url === '/api/sider/profiles') {
      const profiles = await listSiderProfiles();
      return sendJson(res, 200, { profiles });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/sider/conversations')) {
      const url = new URL(req.url, 'http://localhost');
      const result = await inspectSiderConversations({
        profile: url.searchParams.get('profile') || '',
        limit: url.searchParams.get('limit') || 30
      });
      return sendJson(res, 200, result);
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        service: '万物 Markdown',
        time: new Date().toISOString()
      });
    }

    if (req.method === 'POST' && req.url === '/api/live/open') {
      const payload = await readJsonBody(req);
      const result = await openLiveCaptureSession(payload);
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && req.url === '/api/live/capture') {
      const payload = await readJsonBody(req);
      const result = await captureLiveSession(payload.sessionId);
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && req.url === '/api/live/close') {
      const payload = await readJsonBody(req);
      const result = await closeLiveCaptureSession(payload.sessionId);
      return sendJson(res, 200, result);
    }

    if (req.method === 'GET' && req.url === '/api/obsidian/vaults') {
      const vaults = await findObsidianVaults();
      return sendJson(res, 200, { vaults });
    }

    if (req.method === 'POST' && req.url === '/api/sider/recover') {
      const payload = await readJsonBody(req);
      const result = await recoverSiderConversation({
        profile: payload.profile,
        chatId: payload.chatId
      });
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && req.url === '/api/conversation/import') {
      const body = await readJsonBody(req);
      const result = await exportConversationPayload(body.payload || body, {
        adapter: 'json-import'
      });
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && req.url === '/api/obsidian/export') {
      const body = await readJsonBody(req);
      const result = await exportToObsidian(body);
      return sendJson(res, 200, result);
    }

    if (req.method === 'GET') {
      const filePath = safePublicPath(req.url === '/' ? '/index.html' : req.url);
      const data = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
      return res.end(data);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendJson(res, statusCode, {
      error: error.message || '服务异常'
    });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`万物 Markdown MVP 已启动：http://localhost:${PORT}\n`);
});

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64 * 1024 * 1024) {
      const error = new Error('请求体过大');
      error.statusCode = 413;
      throw error;
    }
  }

  return body ? JSON.parse(body) : {};
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function safePublicPath(urlPath = '/') {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = resolve(join(PUBLIC_DIR, decoded));
  if (!resolved.startsWith(PUBLIC_DIR)) {
    const error = new Error('非法路径');
    error.statusCode = 400;
    throw error;
  }
  return resolved;
}

import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';

import { browserExtractPage } from './browser-extractor.js';
import { createCaptureDocument, documentToJsonl, documentToMarkdown, validateCaptureRequest } from '../core/schema.js';
import { sanitizeFilename } from '../core/extractors.js';

const DEFAULT_WAIT_MS = 4500;

export async function captureUrl(payload, options = {}) {
  const validation = validateCaptureRequest(payload);
  if (!validation.ok) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const request = validation.value;
  const outRoot = options.outRoot || resolve('captures');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = join(outRoot, `${sanitizeFilename(new URL(request.url).hostname)}-${runId}`);
  await mkdir(runDir, { recursive: true });

  const browser = await launchChrome({
    url: request.url,
    visible: Boolean(payload.visibleBrowser),
    waitMs: payload.waitMs || DEFAULT_WAIT_MS
  });

  try {
    const page = await waitForPage(browser.port, request.url);
    const client = await connectPage(page.webSocketDebuggerUrl);
    const raw = await evaluateExtractor(client, request);
    const doc = createCaptureDocument(raw);

    if (request.saveAssets) {
      await saveLoadedAssets({ client, doc, runDir });
    }

    const markdown = documentToMarkdown(doc);
    const jsonl = documentToJsonl(doc);
    const json = JSON.stringify(doc, null, 2);

    const markdownPath = join(runDir, 'document.md');
    const jsonPath = join(runDir, 'document.json');
    const jsonlPath = join(runDir, 'dataset.jsonl');

    await writeFile(markdownPath, markdown, 'utf8');
    await writeFile(jsonPath, json, 'utf8');
    await writeFile(jsonlPath, jsonl, 'utf8');
    await client.close();

    return {
      document: doc,
      markdown,
      json,
      jsonl,
      files: {
        directory: runDir,
        markdown: markdownPath,
        json: jsonPath,
        jsonl: jsonlPath
      },
      browser: {
        visible: Boolean(payload.visibleBrowser)
      }
    };
  } finally {
    if (payload.keepBrowserOpen) {
      browser.child.unref();
    } else {
      browser.child.kill('SIGTERM');
      setTimeout(() => browser.child.kill('SIGKILL'), 1500).unref();
      await rm(browser.profileDir, { recursive: true, force: true });
    }
  }
}

async function launchChrome({ url, visible, waitMs }) {
  const chromePath = findChrome();
  const profileDir = await mkdtemp(join(tmpdir(), 'wanwu-markdown-chrome-'));
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-background-networking',
    '--window-size=1440,1200'
  ];

  if (!visible) args.unshift('--headless=new');
  args.push(url);

  const child = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const port = await waitForDevtoolsPort(child);
  await sleep(waitMs);
  return { child, port, profileDir };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('未找到 Chrome/Chromium。请安装 Chrome，或设置 CHROME_PATH。');
  }
  return found;
}

function waitForDevtoolsPort(child) {
  return new Promise((resolvePort, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome DevTools 启动超时')), 15000);

    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) {
        clearTimeout(timer);
        resolvePort(Number(match[1]));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code) => {
      if (!buffer.includes('DevTools listening')) {
        clearTimeout(timer);
        reject(new Error(`Chrome 提前退出，code=${code}`));
      }
    });
  });
}

async function waitForPage(port, expectedUrl) {
  for (let index = 0; index < 30; index += 1) {
    const pages = await fetchJson(`http://127.0.0.1:${port}/json`);
    const page = pages.find((item) => item.type === 'page' && item.url && (item.url === expectedUrl || item.url.startsWith(expectedUrl) || expectedUrl.startsWith(item.url)));
    if (page) return page;
    await sleep(300);
  }
  throw new Error('没有找到 Chrome 页面目标');
}

async function connectPage(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolveOpen, reject) => {
    ws.onopen = resolveOpen;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolveSend) => {
      const messageId = ++id;
      pending.set(messageId, resolveSend);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');

  return {
    send,
    async close() {
      ws.close();
    }
  };
}

async function evaluateExtractor(client, request) {
  const expression = `(${browserExtractPage.toString()})(${JSON.stringify(request)})`;
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  if (result.result?.exceptionDetails) {
    throw new Error(`页面抽取失败：${JSON.stringify(result.result.exceptionDetails)}`);
  }

  return result.result.result.value;
}

async function saveLoadedAssets({ client, doc, runDir }) {
  const assetDir = join(runDir, 'assets');
  await mkdir(assetDir, { recursive: true });
  const tree = await client.send('Page.getResourceTree');
  const frameId = tree.result.frameTree.frame.id;
  const attachments = [
    ...(doc.assets || []),
    ...(doc.blocks || []).flatMap((block) => block.attachments || [])
  ].filter((asset) => asset.type === 'image' && asset.url && !asset.localPath);

  for (let index = 0; index < attachments.length; index += 1) {
    const asset = attachments[index];
    try {
      const resource = await client.send('Page.getResourceContent', { frameId, url: asset.url });
      const extension = extname(new URL(asset.url).pathname) || '.jpg';
      const name = `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(asset.name || basename(new URL(asset.url).pathname), 'image')}${extension}`;
      const localPath = join(assetDir, name);
      const bytes = resource.result.base64Encoded ? Buffer.from(resource.result.content, 'base64') : Buffer.from(resource.result.content, 'utf8');
      await writeFile(localPath, bytes);
      asset.localPath = localPath;
    } catch {
      // 保留远程 URL；资产保存失败不应阻断文本采集。
    }
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`请求失败：${url}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

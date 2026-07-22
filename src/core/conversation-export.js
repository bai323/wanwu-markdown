import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  conversationGraphToCaptureDocument,
  conversationGraphToMarkdown,
  normalizeConversationGraph
} from './conversation-graph.js';
import { conversationGraphToHtml } from './conversation-report.js';
import { buildAssetManifest, documentToJsonl } from './schema.js';
import { sanitizeFilename } from './extractors.js';

export async function exportConversationPayload(payload, options = {}) {
  const graph = normalizeConversationGraph(payload, options);
  if (!graph.messages.length) {
    const error = new Error('没有在输入数据中找到对话消息');
    error.statusCode = 400;
    throw error;
  }

  const document = conversationGraphToCaptureDocument(graph);
  const markdown = conversationGraphToMarkdown(graph);
  const jsonl = documentToJsonl(document);
  const reportHtml = conversationGraphToHtml(graph);
  const json = JSON.stringify({ graph, document }, null, 2);
  const outRoot = options.outRoot || resolve('captures');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = join(outRoot, `${sanitizeFilename(graph.title, 'conversation').slice(0, 64)}-${runId}`);
  await mkdir(runDir, { recursive: true });

  const files = {
    directory: runDir,
    markdown: join(runDir, 'conversation.md'),
    json: join(runDir, 'conversation.graph.json'),
    jsonl: join(runDir, 'dataset.jsonl'),
    report: join(runDir, 'branch-report.html'),
    manifest: join(runDir, 'manifest.json')
  };
  const manifest = buildAssetManifest(document, files);

  await Promise.all([
    writeFile(files.markdown, markdown, 'utf8'),
    writeFile(files.json, json, 'utf8'),
    writeFile(files.jsonl, jsonl, 'utf8'),
    writeFile(files.report, reportHtml, 'utf8'),
    writeFile(files.manifest, JSON.stringify(manifest, null, 2), 'utf8')
  ]);

  return { graph, document, markdown, json, jsonl, reportHtml, manifest, files };
}

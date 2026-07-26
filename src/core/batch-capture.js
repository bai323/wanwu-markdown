import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { documentToHtmlReport } from './document-report.js';
import { buildAssetManifest, createCaptureDocument, documentToJsonl, documentToMarkdown } from './schema.js';
import { sanitizeFilename } from './extractors.js';

export function extractHttpUrls(value = '') {
  const seen = new Set();
  const matches = String(value).match(/https?:\/\/[^\s<>"']+/g) || [];
  const urls = [];

  for (const match of matches) {
    const url = match.replace(/[，。；、,.!?;:）)\]]+$/g, '');
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

export function aggregateBatchCaptureResults(items = []) {
  const total = items.length;
  const successCount = items.filter((item) => item.ok).length;
  const doc = createCaptureDocument({
    title: `批量采集 ${successCount}/${total}`,
    kind: 'collection',
    adapter: 'wechat-reading-list',
    blocks: items.map((item, index) => batchBlock(item, index))
  });
  const markdown = documentToMarkdown(doc);
  const json = JSON.stringify({ items, document: doc }, null, 2);
  const jsonl = documentToJsonl(doc);
  const reportHtml = documentToHtmlReport(doc);

  return {
    document: doc,
    markdown,
    json,
    jsonl,
    reportHtml,
    items,
    summary: {
      total,
      success: successCount,
      failed: total - successCount
    }
  };
}

export async function exportBatchCaptureResults(items = [], options = {}) {
  const aggregate = aggregateBatchCaptureResults(items);
  const outRoot = options.outRoot || resolve('captures');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = join(outRoot, `${sanitizeFilename(aggregate.document.title, 'batch-capture')}-${runId}`);
  await mkdir(runDir, { recursive: true });

  const files = {
    directory: runDir,
    markdown: join(runDir, 'batch.md'),
    json: join(runDir, 'batch.json'),
    jsonl: join(runDir, 'dataset.jsonl'),
    report: join(runDir, 'reading-report.html'),
    manifest: join(runDir, 'manifest.json')
  };
  const manifest = buildAssetManifest(aggregate.document, files);

  await Promise.all([
    writeFile(files.markdown, aggregate.markdown, 'utf8'),
    writeFile(files.json, aggregate.json, 'utf8'),
    writeFile(files.jsonl, aggregate.jsonl, 'utf8'),
    writeFile(files.report, aggregate.reportHtml, 'utf8'),
    writeFile(files.manifest, JSON.stringify(manifest, null, 2), 'utf8')
  ]);

  return {
    ...aggregate,
    files,
    manifest
  };
}

function batchBlock(item, index) {
  if (!item.ok) {
    return {
      id: `batch-${index + 1}`,
      type: 'content',
      title: `采集失败：${item.url}`,
      contentMarkdown: [
        `- 来源：${item.url}`,
        `- 状态：失败`,
        `- 原因：${item.error || '未知错误'}`
      ].join('\n')
    };
  }

  const title = item.result?.document?.title || item.url;
  const files = item.result?.files || {};
  return {
    id: `batch-${index + 1}`,
    type: 'content',
    title,
    contentMarkdown: [
      `- 来源：${item.result?.document?.source?.url || item.url}`,
      '- 状态：已采集',
      files.markdown ? `- Markdown：${files.markdown}` : '',
      files.report ? `- HTML 阅读报告：${files.report}` : '',
      '',
      previewMarkdown(item.result?.document)
    ].filter(Boolean).join('\n'),
    metadata: {
      sourceUrl: item.result?.document?.source?.url || item.url,
      files
    }
  };
}

function previewMarkdown(doc = {}) {
  const text = (doc.blocks || [])
    .map((block) => block.contentMarkdown || '')
    .join('\n\n')
    .trim();
  if (!text) return '无正文预览';
  return text.length > 800 ? `${text.slice(0, 800)}\n\n...` : text;
}

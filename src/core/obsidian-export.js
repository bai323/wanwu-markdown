import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';

import { sanitizeFilename } from './extractors.js';

export async function exportToObsidian(payload = {}) {
  const vaultPath = normalizeVaultPath(payload.vaultPath);
  const title = payload.document?.title || payload.title || '万物 Markdown 采集';
  const noteName = `${sanitizeFilename(title, 'wanwu-markdown')}.md`;
  const targetDirectory = resolveVaultFolder(vaultPath, payload.folder || '万物Markdown');

  await mkdir(join(vaultPath, '.obsidian'), { recursive: true });
  await mkdir(targetDirectory, { recursive: true });

  const notePath = join(targetDirectory, noteName);
  const basePath = join(targetDirectory, sanitizeFilename(title, 'wanwu-markdown'));
  const markdown = buildObsidianMarkdown(payload);
  const sidecars = {};

  await writeFile(notePath, markdown, 'utf8');

  if (payload.includeJson && payload.json) {
    sidecars.json = `${basePath}.data.json`;
    await writeFile(sidecars.json, payload.json, 'utf8');
  }

  if (payload.includeDataset && payload.jsonl) {
    sidecars.dataset = `${basePath}.dataset.jsonl`;
    await writeFile(sidecars.dataset, payload.jsonl, 'utf8');
  }

  if (payload.includeReport && payload.reportHtml) {
    sidecars.report = `${basePath}.branch-report.html`;
    await writeFile(sidecars.report, payload.reportHtml, 'utf8');
  }

  return {
    vaultPath,
    targetDirectory,
    notePath,
    sidecars
  };
}

export async function findObsidianVaults(options = {}) {
  const roots = options.roots || defaultVaultRoots();
  const maxDepth = Number(options.maxDepth ?? 3);
  const found = new Map();

  for (const root of roots.filter(Boolean)) {
    const rootConfig = typeof root === 'string' ? { path: root, maxDepth } : root;
    const resolvedRoot = resolve(expandHome(rootConfig.path || ''));
    if (!existsSync(resolvedRoot)) continue;
    await scanForVaults(resolvedRoot, Number(rootConfig.maxDepth ?? maxDepth), found);
  }

  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function buildObsidianMarkdown(payload) {
  const doc = payload.document || {};
  const tags = [
    'wanwu-markdown',
    doc.kind || 'capture',
    doc.adapter || ''
  ].filter(Boolean);
  const models = Object.keys(payload.graph?.stats?.models || {});
  const frontmatter = [
    '---',
    `title: ${yamlScalar(doc.title || payload.title || '万物 Markdown 采集')}`,
    `source: ${yamlScalar(doc.source?.url || '')}`,
    `kind: ${doc.kind || 'webpage'}`,
    `adapter: ${doc.adapter || 'generic-page'}`,
    `captured: ${doc.capturedAt || new Date().toISOString()}`,
    'tags:',
    ...tags.map((tag) => `  - ${yamlTag(tag)}`),
    ...(models.length ? ['models:', ...models.map((model) => `  - ${yamlScalar(model)}`)] : []),
    '---',
    ''
  ].join('\n');

  return `${frontmatter}${String(payload.markdown || '').trim()}\n`;
}

function normalizeVaultPath(value) {
  const expanded = expandHome(String(value || '').trim());
  if (!expanded) {
    const error = new Error('请输入 Obsidian 仓库路径');
    error.statusCode = 400;
    throw error;
  }

  if (!isAbsolute(expanded)) {
    const error = new Error('Obsidian 仓库路径必须是绝对路径');
    error.statusCode = 400;
    throw error;
  }

  return resolve(expanded);
}

function resolveVaultFolder(vaultPath, folder) {
  const parts = String(folder || '')
    .split(/[\\/]+/)
    .map(safeFolderSegment)
    .filter(Boolean);
  const target = resolve(vaultPath, ...parts);
  if (target !== vaultPath && !target.startsWith(`${vaultPath}${sep}`)) {
    const error = new Error('Obsidian 输出目录不能离开仓库');
    error.statusCode = 400;
    throw error;
  }
  return target;
}

async function scanForVaults(directory, depth, found) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  if (entries.some((entry) => entry.isDirectory() && entry.name === '.obsidian')) {
    found.set(directory, {
      name: basename(directory),
      path: directory
    });
    return;
  }

  if (depth <= 0) return;

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) continue;
    await scanForVaults(join(directory, entry.name), depth - 1, found);
  }
}

function defaultVaultRoots() {
  const home = homedir();
  return [
    process.env.OBSIDIAN_VAULT_PATH ? { path: process.env.OBSIDIAN_VAULT_PATH, maxDepth: 1 } : null,
    { path: join(home, 'Documents', 'Obsidian'), maxDepth: 2 },
    { path: join(home, 'Documents', 'Obsidian Vaults'), maxDepth: 2 },
    { path: join(home, 'Documents'), maxDepth: 1 },
    { path: join(home, 'Desktop'), maxDepth: 1 },
    { path: join(home, 'Obsidian'), maxDepth: 2 },
    { path: join(home, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'), maxDepth: 2 }
  ];
}

function expandHome(value) {
  return value.startsWith('~/') ? join(homedir(), value.slice(2)) : value;
}

function safeFolderSegment(value) {
  return String(value || '')
    .replace(/[<>:"|?*\u0000-\u001f]/g, ' ')
    .replace(/\.+/g, '.')
    .replace(/(^|[\s-])\.+(?=[\s-]|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipDirectory(name) {
  return name.startsWith('.') || [
    'node_modules',
    'Library',
    'Applications',
    'Downloads',
    'Movies',
    'Music',
    'Pictures',
    'Public',
    'dist',
    'build',
    'coverage',
    'cache',
    'tmp'
  ].includes(name);
}

function yamlScalar(value) {
  return JSON.stringify(String(value || ''));
}

function yamlTag(value) {
  return String(value || '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_/-]/gu, '').replace(/^-+|-+$/g, '') || 'capture';
}

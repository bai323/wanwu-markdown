import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { documentToHtmlReport } from './document-report.js';
import { buildAssetManifest, createCaptureDocument, documentToJsonl, documentToMarkdown } from './schema.js';
import { sanitizeFilename } from './extractors.js';

const COLLECTION_LABELS = {
  bookmarks: 'X Bookmarks',
  likes: 'X Likes',
  visible: 'X Visible Posts'
};

export function normalizeXPosts(payload = {}) {
  const collection = normalizeCollection(payload.collection);
  const posts = normalizePostList(payload.posts || payload.data || []);
  return createCaptureDocument({
    title: COLLECTION_LABELS[collection] || 'X Collection',
    kind: 'collection',
    adapter: `x-${collection}`,
    sourceUrl: payload.sourceUrl || collectionSourceUrl(collection),
    blocks: posts.map((post, index) => postToBlock(post, index)),
    metadata: {
      source: payload.source || 'manual-import',
      collection,
      importedAt: new Date().toISOString()
    }
  });
}

export async function exportXCollectionPayload(payload = {}, options = {}) {
  const document = normalizeXPosts(payload);
  const markdown = documentToMarkdown(document);
  const jsonl = documentToJsonl(document);
  const json = JSON.stringify(document, null, 2);
  const reportHtml = documentToHtmlReport(document);
  const outRoot = options.outRoot || resolve('captures');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = join(outRoot, `${sanitizeFilename(document.title, 'x-collection')}-${runId}`);
  await mkdir(runDir, { recursive: true });

  const files = {
    directory: runDir,
    markdown: join(runDir, 'x-collection.md'),
    json: join(runDir, 'x-collection.json'),
    jsonl: join(runDir, 'dataset.jsonl'),
    report: join(runDir, 'x-report.html'),
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

  return { document, markdown, json, jsonl, reportHtml, manifest, files };
}

export function buildXApiUrl({ userId, collection = 'bookmarks', maxResults = 50, paginationToken = '' } = {}) {
  if (!userId) throw new Error('请输入 X user id');
  const endpoint = normalizeCollection(collection) === 'likes'
    ? `/2/users/${encodeURIComponent(userId)}/liked_posts`
    : `/2/users/${encodeURIComponent(userId)}/bookmarks`;
  const url = new URL(endpoint, 'https://api.x.com');
  url.searchParams.set('max_results', String(Math.min(Math.max(Number(maxResults) || 50, 10), 100)));
  url.searchParams.set('tweet.fields', 'created_at,entities,attachments,author_id,conversation_id,public_metrics');
  url.searchParams.set('expansions', 'author_id,attachments.media_keys');
  url.searchParams.set('user.fields', 'name,username');
  url.searchParams.set('media.fields', 'url,preview_image_url,type');
  if (paginationToken) url.searchParams.set('pagination_token', paginationToken);
  return url;
}

export async function fetchXCollection({ userId, collection = 'bookmarks', bearerToken, maxResults = 50, paginationToken = '', fetchImpl = fetch } = {}) {
  if (!bearerToken) {
    const error = new Error('请输入 X Bearer Token');
    error.statusCode = 400;
    throw error;
  }

  const url = buildXApiUrl({ userId, collection, maxResults, paginationToken });
  const response = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${bearerToken}`,
      accept: 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.detail || data?.title || data?.errors?.[0]?.message || 'X API 同步失败');
    error.statusCode = response.status;
    throw error;
  }

  return {
    collection: normalizeCollection(collection),
    source: 'x-official-api',
    nextToken: data.meta?.next_token || '',
    posts: normalizeXApiPosts(data)
  };
}

function normalizeXApiPosts(data = {}) {
  const users = new Map((data.includes?.users || []).map((user) => [user.id, user]));
  const media = new Map((data.includes?.media || []).map((item) => [item.media_key, item]));

  return (data.data || []).map((tweet) => {
    const author = users.get(tweet.author_id) || {};
    const mediaItems = (tweet.attachments?.media_keys || [])
      .map((key) => media.get(key))
      .filter(Boolean)
      .map((item) => ({
        type: item.type === 'photo' ? 'image' : item.type || 'media',
        url: item.url || item.preview_image_url || '',
        name: item.media_key || 'x-media'
      }))
      .filter((item) => item.url);
    return {
      id: tweet.id,
      url: `https://x.com/${author.username || 'i'}/status/${tweet.id}`,
      authorName: author.name || '',
      authorHandle: author.username || '',
      text: tweet.text || '',
      createdAt: tweet.created_at || '',
      media: mediaItems,
      links: (tweet.entities?.urls || []).map((link) => ({
        text: link.display_url || link.expanded_url || link.url,
        href: link.expanded_url || link.url
      }))
    };
  });
}

function normalizePostList(posts) {
  if (!Array.isArray(posts)) return [];
  const seen = new Set();
  const normalized = [];

  for (const post of posts) {
    const id = post.id || post.rest_id || post.url || post.text;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id: String(id),
      url: post.url || post.permalink || '',
      authorName: post.authorName || post.author?.name || '',
      authorHandle: cleanHandle(post.authorHandle || post.author?.username || post.author?.handle || ''),
      text: post.text || post.full_text || post.content || '',
      createdAt: post.createdAt || post.created_at || '',
      media: normalizeMedia(post.media || post.attachments || []),
      links: normalizeLinks(post.links || post.urls || [])
    });
  }

  return normalized.filter((post) => post.text || post.url);
}

function postToBlock(post, index) {
  const authorLine = post.authorHandle ? `${post.authorName || post.authorHandle} (@${post.authorHandle})` : post.authorName || 'X 用户';
  const lines = [
    `- 作者：${authorLine}`,
    post.url ? `- 原文：${post.url}` : '',
    post.createdAt ? `- 时间：${post.createdAt}` : '',
    '',
    post.text || ''
  ].filter((line) => line !== '');

  return {
    id: post.id || `x-${index + 1}`,
    type: 'content',
    title: `${authorLine} · X Post`,
    contentMarkdown: lines.join('\n'),
    links: post.links,
    attachments: post.media,
    metadata: {
      platform: 'x',
      authorName: post.authorName,
      authorHandle: post.authorHandle,
      createdAt: post.createdAt,
      sourceUrl: post.url
    }
  };
}

function normalizeCollection(value) {
  return value === 'likes' ? 'likes' : value === 'visible' ? 'visible' : 'bookmarks';
}

function collectionSourceUrl(collection) {
  if (collection === 'likes') return 'https://x.com/i/likes';
  if (collection === 'visible') return 'https://x.com/';
  return 'https://x.com/i/bookmarks';
}

function cleanHandle(value) {
  return String(value || '').replace(/^@/, '');
}

function normalizeMedia(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      type: item.type === 'photo' ? 'image' : item.type || 'image',
      name: item.name || item.alt || 'x-media',
      url: item.url || item.src || item.preview_image_url || '',
      width: item.width || 0,
      height: item.height || 0
    }))
    .filter((item) => item.url);
}

function normalizeLinks(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      text: item.text || item.display_url || item.href || item.url || '',
      href: item.href || item.expanded_url || item.url || ''
    }))
    .filter((item) => item.href);
}

import { ADAPTERS } from './extractors.js';

const DEFAULT_LABEL = Object.freeze({
  intent: '',
  quality: 'unlabeled',
  reusable: false,
  risk: '',
  notes: ''
});

export function validateCaptureRequest(payload = {}) {
  const adapter = payload.adapter || 'auto';

  if (!ADAPTERS.includes(adapter)) {
    return { ok: false, error: `未知适配器：${adapter}` };
  }

  if (!payload.url || typeof payload.url !== 'string') {
    return { ok: false, error: '请输入 URL' };
  }

  let parsed;
  try {
    parsed = new URL(payload.url);
  } catch {
    return { ok: false, error: 'URL 格式不正确' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: '只支持 http 和 https URL' };
  }

  return {
    ok: true,
    value: {
      url: parsed.href,
      adapter,
      saveAssets: payload.saveAssets !== false,
      includeProcess: payload.includeProcess !== false
    }
  };
}

export function normalizeLabel(label = {}) {
  return {
    ...DEFAULT_LABEL,
    ...label,
    reusable: Boolean(label.reusable)
  };
}

export function createCaptureDocument(input = {}) {
  const capturedAt = input.capturedAt || new Date().toISOString();
  const blocks = (input.blocks || [])
    .filter((block) => block && String(block.contentMarkdown || '').trim())
    .map((block, index) => ({
      id: block.id || `block-${index + 1}`,
      type: block.type || 'content',
      role: block.role || '',
      model: block.model || '',
      title: block.title || '',
      contentMarkdown: cleanMarkdown(block.contentMarkdown),
      processMarkdown: cleanMarkdown(block.processMarkdown || ''),
      attachments: normalizeAttachments(block.attachments),
      links: normalizeLinks(block.links),
      labels: normalizeLabel(block.labels),
      metadata: block.metadata || {}
    }));

  return {
    version: '0.1',
    title: input.title || '未命名采集',
    kind: input.kind || 'webpage',
    adapter: input.adapter || 'generic-page',
    capturedAt,
    source: {
      url: input.sourceUrl || input.url || '',
      title: input.title || '',
      site: safeHostname(input.sourceUrl || input.url || '')
    },
    blocks,
    links: normalizeLinks(input.links),
    assets: normalizeAttachments(input.assets),
    metadata: input.metadata || {}
  };
}

export function documentToMarkdown(doc) {
  const lines = [];
  const title = doc.title || doc.source?.title || '未命名采集';

  lines.push(`# ${title}`);
  lines.push('');
  if (doc.source?.url) lines.push(`- 来源：${doc.source.url}`);
  lines.push(`- 类型：${doc.kind || 'webpage'}`);
  lines.push(`- 适配器：${doc.adapter || 'generic-page'}`);
  if (doc.capturedAt) lines.push(`- 抓取时间：${doc.capturedAt}`);
  lines.push(`- 内容块数量：${doc.blocks?.length || 0}`);
  lines.push('');
  lines.push('---');

  (doc.blocks || []).forEach((block, index) => {
    lines.push('');
    lines.push(blockTitle(block, index));

    if (block.attachments?.length) {
      lines.push('');
      for (const attachment of block.attachments) {
        if (attachment.type === 'image' && attachment.localPath) {
          lines.push(`![${attachment.name || '附件图片'}](${attachment.localPath})`);
        } else if (attachment.type === 'image' && attachment.url) {
          lines.push(`![${attachment.name || '附件图片'}](${attachment.url})`);
        } else {
          lines.push(`- 附件：${attachment.name || attachment.url || '未命名附件'}`);
        }
      }
    }

    if (block.processMarkdown) {
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>过程 / 工具</summary>');
      lines.push('');
      lines.push(fenced(block.processMarkdown));
      lines.push('');
      lines.push('</details>');
    }

    if (block.links?.length) {
      lines.push('');
      lines.push('<details>');
      lines.push(`<summary>外部链接（${block.links.length}）</summary>`);
      lines.push('');
      for (const link of block.links) {
        lines.push(`- [${escapeLinkText(link.text || link.href)}](${link.href})`);
      }
      lines.push('');
      lines.push('</details>');
    }

    lines.push('');
    lines.push(shiftMarkdownHeadings(block.contentMarkdown, 2));
  });

  return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

export function documentToJsonl(doc) {
  return (doc.blocks || [])
    .map((block, index) =>
      JSON.stringify({
        source: doc.source,
        document: {
          title: doc.title,
          kind: doc.kind,
          adapter: doc.adapter,
          capturedAt: doc.capturedAt
        },
        block: {
          index: index + 1,
          id: block.id,
          type: block.type,
          role: block.role,
          model: block.model,
          content: block.contentMarkdown,
          process: block.processMarkdown,
          attachments: block.attachments,
          links: block.links
        },
        labels: normalizeLabel(block.labels)
      })
    )
    .join('\n') + '\n';
}

export function cleanMarkdown(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function blockTitle(block, index) {
  if (block.type === 'message') {
    const role = block.role === 'assistant' ? '助手' : block.role === 'user' ? '用户' : block.role || '消息';
    return `## ${index + 1}. ${role}${block.model ? `（${block.model}）` : ''}`;
  }

  return `## ${index + 1}. ${block.title || '内容块'}`;
}

function fenced(value) {
  const maxTicks = (String(value).match(/`{3,}/g) || []).reduce((max, ticks) => Math.max(max, ticks.length), 3);
  const fence = '`'.repeat(maxTicks + 1);
  return `${fence}\n${value}\n${fence}`;
}

function normalizeAttachments(attachments = []) {
  return attachments
    .filter(Boolean)
    .map((attachment) => ({
      type: attachment.type || 'file',
      name: attachment.name || '',
      url: attachment.url || '',
      localPath: attachment.localPath || '',
      mimeType: attachment.mimeType || '',
      width: attachment.width || 0,
      height: attachment.height || 0
    }));
}

function normalizeLinks(links = []) {
  const seen = new Set();
  const result = [];

  for (const link of links || []) {
    if (!link?.href) continue;
    const key = link.href;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      text: String(link.text || link.href).trim(),
      href: link.href
    });
  }

  return result;
}

function safeHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function shiftMarkdownHeadings(markdown, levels) {
  return cleanMarkdown(markdown).replace(/^(#{1,6})\s+/gm, (match, hashes) => {
    return `${'#'.repeat(Math.min(6, hashes.length + levels))} `;
  });
}

function escapeLinkText(value) {
  return String(value).replace(/[[\]]/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

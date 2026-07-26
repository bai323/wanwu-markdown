const ADAPTER_LABELS = {
  'wechat-article': '微信公众号文章',
  'x-article': 'X 文章 / 帖文',
  'generic-page': '网页内容',
  'sider-share': 'Sider 分享页'
};

export function documentToHtmlReport(doc = {}) {
  const blocks = doc.blocks || [];
  const links = uniqueLinks([...(doc.links || []), ...blocks.flatMap((block) => block.links || [])]);
  const firstBlock = blocks[0] || {};
  const metadata = firstBlock.metadata || {};
  const wordCount = blocks.reduce((sum, block) => sum + textLength(block.contentMarkdown), 0);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title || '阅读报告')}</title>
  <style>${reportStyles()}</style>
</head>
<body>
  <header class="hero">
    <p class="eyebrow">阅读报告</p>
    <h1>${escapeHtml(doc.title || '未命名采集')}</h1>
    <p class="source">${escapeHtml(adapterLabel(doc.adapter))}${metadata.author ? ` · ${escapeHtml(metadata.author)}` : ''}${metadata.publishedAt ? ` · ${escapeHtml(metadata.publishedAt)}` : ''}</p>
  </header>
  <main>
    <section class="summary-grid" aria-label="采集概览">
      <div><span>来源</span><strong>${escapeHtml(doc.source?.site || '-')}</strong></div>
      <div><span>内容块</span><strong>${blocks.length}</strong></div>
      <div><span>字数估算</span><strong>${wordCount}</strong></div>
      <div><span>采集时间</span><strong>${escapeHtml(formatDate(doc.capturedAt))}</strong></div>
    </section>
    <section class="ai-review">
      <h2>AI 评估占位</h2>
      <p>这里适合接入本地或云端模型，自动生成摘要、关键观点、可行动事项、风险提醒与推荐标签。当前 HTML 先保留完整正文和结构，方便后续二次分析。</p>
    </section>
    <section class="content">
      ${blocks.map(renderBlock).join('\n')}
    </section>
    ${links.length ? `<section class="links"><h2>参考链接</h2><ul>${links.map((link) => `<li><a href="${escapeAttr(link.href)}">${escapeHtml(link.text || link.href)}</a></li>`).join('')}</ul></section>` : ''}
  </main>
</body>
</html>`;
}

function renderBlock(block, index) {
  return `<article class="block">
  <div class="block-index">${index + 1}</div>
  <div class="block-body">
    ${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}
    ${markdownToHtml(block.contentMarkdown)}
  </div>
</article>`;
}

function markdownToHtml(markdown = '') {
  const lines = String(markdown || '').split('\n');
  const html = [];
  let list = [];

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  flushList();
  return html.join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function uniqueLinks(links) {
  const seen = new Set();
  const result = [];
  for (const link of links) {
    if (!link?.href || seen.has(link.href)) continue;
    seen.add(link.href);
    result.push(link);
  }
  return result;
}

function adapterLabel(adapter) {
  return ADAPTER_LABELS[adapter] || adapter || '网页内容';
}

function textLength(value) {
  return String(value || '').replace(/\s+/g, '').length;
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function reportStyles() {
  return `
    :root{--bg:#f7f6f2;--ink:#24262d;--muted:#697182;--line:#dedbd2;--surface:#fffdf8;--accent:#6d5df2;--green:#287c66}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72}
    .hero{padding:44px max(24px,calc((100vw - 1040px)/2)) 28px;background:#20232b;color:#fff}
    .eyebrow{margin:0 0 8px;color:#c7bfff;font-size:12px;font-weight:800;letter-spacing:.08em}
    h1{max-width:920px;margin:0;font-size:clamp(30px,4vw,54px);line-height:1.1;letter-spacing:0}
    .source{margin:16px 0 0;color:#c9ccd5}main{max-width:1040px;margin:0 auto;padding:24px 24px 64px}
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
    .summary-grid div,.ai-review,.block,.links{border:1px solid var(--line);border-radius:8px;background:var(--surface)}
    .summary-grid div{padding:14px}.summary-grid span{display:block;color:var(--muted);font-size:12px}.summary-grid strong{display:block;margin-top:4px;font-size:18px}
    .ai-review{margin:18px 0;padding:20px;border-color:#b9d8cd;background:#f2faf6}.ai-review h2,.links h2{margin:0 0 8px;font-size:18px}.ai-review p{margin:0;color:#405149}
    .block{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;margin:14px 0;padding:18px}.block-index{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#ede9ff;color:var(--accent);font-weight:800}
    .block-body{min-width:0}.block h2{margin:2px 0 14px;font-size:22px}.block h3{margin:20px 0 8px;font-size:18px}.block p{margin:10px 0}.block ul{padding-left:20px}.block a,.links a{color:var(--green);text-decoration:none}.block code{border-radius:4px;background:#ece9df;padding:2px 5px}
    .links{margin-top:18px;padding:20px}.links ul{margin:0;padding-left:20px}
    @media(max-width:760px){.hero{padding:32px 18px 22px}main{padding:18px}.summary-grid{grid-template-columns:1fr 1fr}.block{grid-template-columns:1fr}.block-index{margin-bottom:4px}}
  `;
}

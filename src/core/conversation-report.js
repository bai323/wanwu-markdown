import { modelDisplayName } from './conversation-graph.js';

export function conversationGraphToHtml(graph) {
  const messageMap = new Map(graph.messages.map((message) => [message.id, message]));
  const models = Object.entries(graph.stats.models || {});
  const branches = graph.branchPoints
    .map((point, index) => branchSection(point, index, messageMap))
    .join('');
  const timeline = graph.activePathIds
    .map((id, index) => timelineMessage(messageMap.get(id), index))
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(graph.title)} · 对话分支报告</title>
  <style>${reportStyles()}</style>
</head>
<body>
  <header class="report-head">
    <div>
      <p class="eyebrow">万物 Markdown · 对话图报告</p>
      <h1>${escapeHtml(graph.title)}</h1>
      <p class="subline">${graph.stats.messageCount} 条消息 · ${graph.stats.branchPointCount} 个分叉点 · ${models.length} 个模型</p>
    </div>
    <dl class="metrics">
      <div><dt>主分支</dt><dd>${graph.stats.activeMessageCount}</dd></div>
      <div><dt>其他分支</dt><dd>${graph.stats.branchMessageCount}</dd></div>
      <div><dt>文本字符</dt><dd>${formatNumber(graph.stats.textCharacterCount)}</dd></div>
    </dl>
  </header>

  <main>
    <section class="legend-band" aria-label="模型图例">
      <h2>模型图例</h2>
      <div class="legend-list">
        ${models.map(([model, count]) => modelBadge(model, count)).join('') || '<span class="muted">未识别模型</span>'}
      </div>
    </section>

    <nav class="report-tabs" aria-label="报告视图">
      <button class="active" data-view="branches" type="button">分支对比</button>
      <button data-view="timeline" type="button">当前主分支</button>
    </nav>

    <section id="branches-view" class="view active">
      ${branches || '<div class="empty">本次对话没有检测到分叉。</div>'}
    </section>

    <section id="timeline-view" class="view">
      <div class="timeline">${timeline}</div>
    </section>
  </main>

  <script>${reportScript()}</script>
</body>
</html>`;
}

function branchSection(point, index, messageMap) {
  const parent = messageMap.get(point.parentId);
  const alternatives = [...point.childIds]
    .sort((left, right) => Number(right === point.activeChildId) - Number(left === point.activeChildId))
    .map((id) => messageMap.get(id))
    .filter(Boolean)
    .map((message) => branchColumn(message, point.activeChildId === message.id))
    .join('');

  return `<article class="branch-section" data-branch-point="${escapeAttr(point.parentId)}">
    <header class="branch-head">
      <div><span class="branch-number">分叉 ${index + 1}</span><h2>${escapeHtml(point.parentPreview || '未命名分叉')}</h2></div>
      <code>${escapeHtml(point.parentId)}</code>
    </header>
    <details class="context"><summary>查看分叉前消息</summary><div class="markdown">${formatMarkdown(parent?.contentMarkdown || '')}</div></details>
    <div class="comparison-grid">${alternatives}</div>
  </article>`;
}

function branchColumn(message, active) {
  const family = modelFamily(message.model);
  return `<section class="message-column ${active ? 'selected' : ''}" data-family="${family}" data-model="${escapeAttr(message.model)}">
    <header>
      <div>
        <span class="status">${active ? '当前选择' : '替代分支'}</span>
        <h3>${escapeHtml(modelDisplayName(message.model || message.role))}</h3>
      </div>
      <span class="model-dot" aria-hidden="true"></span>
    </header>
    <p class="message-meta">${roleLabel(message.role)} · ${escapeHtml(message.createdAt || '时间未知')}</p>
    ${message.processMarkdown ? `<details><summary>思考 / 工具过程</summary><pre>${escapeHtml(message.processMarkdown)}</pre></details>` : ''}
    <div class="markdown">${formatMarkdown(message.contentMarkdown || '(空消息)')}</div>
    <footer><code>${escapeHtml(message.id)}</code></footer>
  </section>`;
}

function timelineMessage(message, index) {
  if (!message) return '';
  const family = modelFamily(message.model);
  return `<article class="timeline-message" data-family="${family}">
    <div class="timeline-index">${index + 1}</div>
    <div class="timeline-body">
      <header><strong>${roleLabel(message.role)}</strong><span>${escapeHtml(modelDisplayName(message.model))}</span></header>
      ${message.processMarkdown ? `<details><summary>思考 / 工具过程</summary><pre>${escapeHtml(message.processMarkdown)}</pre></details>` : ''}
      <div class="markdown">${formatMarkdown(message.contentMarkdown || '(空消息)')}</div>
    </div>
  </article>`;
}

function modelBadge(model, count) {
  return `<span class="model-badge" data-family="${modelFamily(model)}" data-model="${escapeAttr(model)}"><i></i>${escapeHtml(modelDisplayName(model))}<b>${count}</b></span>`;
}

function modelFamily(model = '') {
  const value = model.toLowerCase();
  if (value.includes('claude')) return 'claude';
  if (value.includes('gpt') || value.includes('openai')) return 'gpt';
  if (value.includes('gemini')) return 'gemini';
  if (value.includes('deepseek')) return 'deepseek';
  if (value.includes('grok')) return 'grok';
  if (value.includes('qwen')) return 'qwen';
  if (value.includes('glm')) return 'glm';
  return 'other';
}

function formatMarkdown(markdown) {
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/s, '<p>$1</p>');
}

function roleLabel(role) {
  return role === 'user' ? '用户' : role === 'assistant' ? '助手' : role === 'system' ? '系统' : role || '消息';
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN', { notation: value > 9999 ? 'compact' : 'standard' }).format(value || 0);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function reportStyles() {
  return `
    :root{--bg:#f4f6f8;--surface:#fff;--ink:#161a22;--muted:#667085;--line:#d9dee7;--accent:#1769e0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink)}button{font:inherit}.report-head{display:flex;justify-content:space-between;gap:32px;padding:38px max(28px,calc((100vw - 1500px)/2));background:#121720;color:#fff}.eyebrow{margin:0 0 10px;color:#8db6ff;font-size:12px;font-weight:800;text-transform:uppercase}.report-head h1{max-width:900px;margin:0;font-size:clamp(26px,4vw,48px);line-height:1.08;letter-spacing:0}.subline{margin:14px 0 0;color:#b8c0ce}.metrics{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));align-self:end;margin:0}.metrics div{border-left:1px solid #364050;padding:6px 18px}.metrics dt{color:#9da8b8;font-size:12px}.metrics dd{margin:4px 0 0;font-size:24px;font-weight:800}main{max-width:1500px;margin:0 auto;padding:0 28px 60px}.legend-band{display:flex;align-items:center;gap:20px;padding:22px 0;border-bottom:1px solid var(--line)}.legend-band h2{margin:0;font-size:14px}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.model-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:6px;background:#fff;padding:6px 9px;font-size:12px}.model-badge i,.model-dot{width:9px;height:9px;border-radius:50%;background:#788295}.model-badge b{color:var(--muted)}[data-family="gpt"] i,[data-family="gpt"] .model-dot{background:#11966f}[data-family="claude"] i,[data-family="claude"] .model-dot{background:#d56a3a}[data-family="gemini"] i,[data-family="gemini"] .model-dot{background:#3979dc}[data-family="deepseek"] i,[data-family="deepseek"] .model-dot{background:#17a6b6}[data-family="grok"] i,[data-family="grok"] .model-dot{background:#161a22}[data-family="qwen"] i,[data-family="qwen"] .model-dot{background:#7455d8}[data-family="glm"] i,[data-family="glm"] .model-dot{background:#c13f81}.report-tabs{display:flex;gap:4px;padding:20px 0 8px}.report-tabs button{border:0;border-bottom:3px solid transparent;background:transparent;padding:10px 13px;color:var(--muted);cursor:pointer}.report-tabs button.active{border-color:var(--accent);color:var(--ink);font-weight:800}.view{display:none}.view.active{display:block}.branch-section{padding:24px 0 34px;border-bottom:1px solid var(--line)}.branch-head{display:flex;justify-content:space-between;gap:20px;align-items:start}.branch-head h2{margin:5px 0 0;font-size:20px}.branch-number{color:var(--accent);font-size:12px;font-weight:800}.branch-head code,.message-column footer code{color:var(--muted);font-size:11px}.context{margin:14px 0}.context summary,.message-column summary,.timeline-message summary{cursor:pointer;color:var(--accent);font-size:12px}.comparison-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:12px;align-items:start}.message-column{min-width:0;border:1px solid var(--line);border-top:4px solid #788295;border-radius:7px;background:var(--surface);padding:16px}.message-column.selected{border-top-color:var(--accent);box-shadow:0 8px 24px rgba(23,105,224,.08)}.message-column>header{display:flex;justify-content:space-between;gap:12px;align-items:start}.message-column h3{margin:4px 0 0;font-size:16px}.status{color:var(--muted);font-size:11px;font-weight:700}.message-column.selected .status{color:var(--accent)}.message-meta{margin:7px 0 14px;color:var(--muted);font-size:11px}.message-column pre,.timeline-message pre{max-height:240px;overflow:auto;white-space:pre-wrap;border:1px solid var(--line);border-radius:6px;background:#f7f9fb;padding:10px;font-size:11px}.markdown{overflow-wrap:anywhere;color:#303746;font-size:13px;line-height:1.65}.markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:18px 0 8px;font-size:1em}.markdown blockquote{margin:10px 0;border-left:3px solid var(--line);padding-left:12px;color:var(--muted)}.markdown code{border-radius:4px;background:#edf1f6;padding:1px 4px}.message-column footer{margin-top:16px;padding-top:10px;border-top:1px solid var(--line)}.timeline{max-width:1000px}.timeline-message{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}.timeline-index{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--muted);font-size:12px}.timeline-body{min-width:0}.timeline-body>header{display:flex;gap:10px;align-items:center;margin-bottom:8px}.timeline-body>header span{color:var(--muted);font-size:12px}.empty{border:1px dashed var(--line);border-radius:7px;padding:36px;color:var(--muted);text-align:center}.muted{color:var(--muted)}
    @media(max-width:760px){.report-head{display:block;padding:28px 20px}.metrics{margin-top:22px}.metrics div{padding:5px 10px}.metrics div:first-child{border-left:0;padding-left:0}main{padding:0 16px 40px}.legend-band{align-items:start;flex-direction:column;gap:10px}.branch-head{display:block}.branch-head code{display:block;margin-top:8px}.comparison-grid{grid-template-columns:1fr}.report-tabs{position:sticky;top:0;z-index:2;background:var(--bg)}}
  `;
}

function reportScript() {
  return `document.querySelectorAll('.report-tabs button').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('.report-tabs button').forEach(function(item){item.classList.toggle('active',item===button)});document.querySelectorAll('.view').forEach(function(view){view.classList.toggle('active',view.id===button.dataset.view+'-view')})})});`;
}

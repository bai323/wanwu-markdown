const state = {
  activeTab: 'graph',
  source: 'web',
  graphMode: 'branches',
  selectedBranchIndex: 0,
  selectedJsonFile: null,
  obsidianVaults: [],
  siderChats: [],
  result: null
};

const elements = {
  captureForm: document.querySelector('#capture-form'),
  aiForm: document.querySelector('#ai-form'),
  siderForm: document.querySelector('#sider-form'),
  jsonForm: document.querySelector('#json-form'),
  profileSelect: document.querySelector('#profile-select'),
  siderChatSelect: document.querySelector('#sider-chat-select'),
  detectedChat: document.querySelector('#detected-chat'),
  detectSiderButton: document.querySelector('#detect-sider-button'),
  jsonFileInput: document.querySelector('#json-file-input'),
  jsonFileName: document.querySelector('#json-file-name'),
  statusText: document.querySelector('#status-text'),
  kindText: document.querySelector('#kind-text'),
  blockCount: document.querySelector('#block-count'),
  branchCount: document.querySelector('#branch-count'),
  fileOutput: document.querySelector('#file-output'),
  markdownOutput: document.querySelector('#markdown-output'),
  jsonOutput: document.querySelector('#json-output'),
  jsonlOutput: document.querySelector('#jsonl-output'),
  annotationList: document.querySelector('#annotation-list'),
  graphEmpty: document.querySelector('#graph-empty'),
  graphWorkbench: document.querySelector('#graph-workbench'),
  graphSummary: document.querySelector('#graph-summary'),
  modelLegend: document.querySelector('#model-legend'),
  branchList: document.querySelector('#branch-list'),
  branchComparison: document.querySelector('#branch-comparison'),
  mainlineList: document.querySelector('#mainline-list'),
  reportPreview: document.querySelector('#report-preview'),
  reportButton: document.querySelector('#report-button'),
  obsidianVaultSelect: document.querySelector('#obsidian-vault-select'),
  obsidianVaultPath: document.querySelector('#obsidian-vault-path'),
  obsidianFolder: document.querySelector('#obsidian-folder'),
  obsidianIncludeJson: document.querySelector('#obsidian-include-json'),
  obsidianIncludeDataset: document.querySelector('#obsidian-include-dataset'),
  obsidianIncludeReport: document.querySelector('#obsidian-include-report'),
  obsidianExportButton: document.querySelector('#obsidian-export-button'),
  refreshVaultsButton: document.querySelector('#refresh-vaults-button')
};

document.querySelectorAll('.source-switch button').forEach((button) => {
  button.addEventListener('click', () => setSource(button.dataset.source));
});

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => setTab(button.dataset.tab));
});

document.querySelectorAll('[data-graph-mode]').forEach((button) => {
  button.addEventListener('click', () => setGraphMode(button.dataset.graphMode));
});

elements.captureForm.addEventListener('submit', handleWebCapture);
elements.aiForm.addEventListener('submit', handleAiCapture);
elements.siderForm.addEventListener('submit', handleSiderRecover);
elements.jsonForm.addEventListener('submit', handleJsonImport);
elements.detectSiderButton.addEventListener('click', () => loadSiderConversations(true));
elements.profileSelect.addEventListener('change', () => loadSiderConversations());
elements.siderChatSelect.addEventListener('change', renderSelectedSiderChat);
elements.refreshVaultsButton.addEventListener('click', () => loadObsidianVaults(true));
elements.obsidianVaultSelect.addEventListener('change', () => {
  elements.obsidianVaultPath.value = elements.obsidianVaultSelect.value;
  saveObsidianSettings();
});
elements.obsidianVaultPath.addEventListener('input', saveObsidianSettings);
elements.obsidianFolder.addEventListener('input', saveObsidianSettings);
elements.obsidianExportButton.addEventListener('click', () => exportToObsidian(elements.obsidianExportButton));

elements.jsonFileInput.addEventListener('change', () => {
  state.selectedJsonFile = elements.jsonFileInput.files?.[0] || null;
  elements.jsonFileName.textContent = state.selectedJsonFile?.name || '选择对话 JSON';
});

document.querySelector('#copy-button').addEventListener('click', async () => {
  const text = currentText();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus('已复制');
});

document.querySelector('#download-button').addEventListener('click', () => {
  const text = currentText();
  if (!text) return;
  const extension = state.activeTab === 'json' ? 'json' : state.activeTab === 'dataset' ? 'jsonl' : state.activeTab === 'report' ? 'html' : 'md';
  const mimeType = state.activeTab === 'report' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';
  downloadText(text, `${safeFilename(state.result?.document?.title || '万物-Markdown')}.${extension}`, mimeType);
});

elements.reportButton.addEventListener('click', () => {
  if (!state.result?.reportHtml) return;
  elements.reportPreview.srcdoc = state.result.reportHtml;
  setTab('report');
  setStatus('报告已生成');
});

loadSiderProfiles();
loadObsidianSettings();
loadObsidianVaults();

async function handleWebCapture(event) {
  event.preventDefault();
  const payload = {
    url: document.querySelector('#url-input').value.trim(),
    adapter: document.querySelector('#adapter-select').value,
    saveAssets: document.querySelector('#save-assets').checked,
    includeProcess: document.querySelector('#include-process').checked,
    visibleBrowser: document.querySelector('#visible-browser').checked
  };
  await runRequest('/api/capture', payload, event.submitter, '采集中');
}

async function handleAiCapture(event) {
  event.preventDefault();
  const payload = {
    url: document.querySelector('#ai-url-input').value.trim(),
    adapter: document.querySelector('#ai-adapter-select').value,
    saveAssets: document.querySelector('#ai-save-assets').checked,
    includeProcess: document.querySelector('#ai-include-process').checked,
    visibleBrowser: document.querySelector('#ai-visible-browser').checked
  };
  await runRequest('/api/capture', payload, event.submitter, '正在采集 AI 对话');
}

async function handleSiderRecover(event) {
  event.preventDefault();
  const payload = {
    profile: elements.profileSelect.value,
    chatId: document.querySelector('#chat-id-input').value.trim() || elements.siderChatSelect.value
  };
  await runRequest('/api/sider/recover', payload, event.submitter, '正在恢复');
}

async function handleJsonImport(event) {
  event.preventDefault();
  if (!state.selectedJsonFile) {
    setStatus('请选择 JSON');
    return;
  }

  const button = event.submitter;
  button.disabled = true;
  setStatus('正在导入');
  try {
    const payload = JSON.parse(await state.selectedJsonFile.text());
    const response = await fetch('/api/conversation/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '导入失败');
    acceptResult(data);
  } catch (error) {
    setStatus(error.message || '导入失败');
  } finally {
    button.disabled = false;
  }
}

async function runRequest(url, payload, button, progressText) {
  setStatus(progressText);
  button.disabled = true;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '处理失败');
    acceptResult(data);
  } catch (error) {
    setStatus(error.message || '处理失败');
  } finally {
    button.disabled = false;
  }
}

function acceptResult(data) {
  state.result = data;
  state.selectedBranchIndex = 0;
  renderResult();
  setStatus('已完成');
  setTab(data.graph ? 'graph' : 'markdown');
  elements.obsidianExportButton.disabled = false;
}

function renderResult() {
  const { document: doc, markdown, json, jsonl, files, graph, reportHtml } = state.result;
  elements.markdownOutput.value = markdown || '';
  elements.jsonOutput.value = json || JSON.stringify(doc, null, 2);
  elements.jsonlOutput.value = jsonl || buildJsonl(doc);
  elements.kindText.textContent = graph ? '对话图' : doc.kind || '-';
  elements.blockCount.textContent = String(graph?.stats?.messageCount || doc.blocks?.length || 0);
  elements.branchCount.textContent = String(graph?.stats?.branchPointCount || 0);
  elements.fileOutput.textContent = files?.directory ? `输出：${files.directory}` : '已生成结果';
  elements.reportButton.disabled = !reportHtml;
  elements.reportPreview.srcdoc = reportHtml || '';
  renderGraph(graph);
  renderAnnotations(doc);
}

function renderGraph(graph) {
  elements.graphEmpty.hidden = Boolean(graph);
  elements.graphWorkbench.hidden = !graph;
  if (!graph) return;

  elements.graphSummary.innerHTML = [
    summaryMetric('消息', graph.stats.messageCount),
    summaryMetric('主分支', graph.stats.activeMessageCount),
    summaryMetric('其他分支', graph.stats.branchMessageCount),
    summaryMetric('分叉点', graph.stats.branchPointCount),
    summaryMetric('模型', Object.keys(graph.stats.models || {}).length)
  ].join('');

  elements.modelLegend.innerHTML = Object.entries(graph.stats.models || {})
    .map(([model, count]) => `<span class="model-chip" data-family="${modelFamily(model)}"><i></i>${escapeHtml(displayModel(model))}<b>${count}</b></span>`)
    .join('');

  renderBranchList(graph);
  renderBranchComparison(graph);
  renderMainline(graph);
}

function renderBranchList(graph) {
  if (!graph.branchPoints.length) {
    elements.branchList.innerHTML = '<div class="empty-state compact">没有检测到分叉</div>';
    return;
  }

  elements.branchList.innerHTML = graph.branchPoints
    .map((point, index) => `
      <button class="branch-item ${index === state.selectedBranchIndex ? 'active' : ''}" type="button" data-branch-index="${index}">
        <span>分叉 ${index + 1}</span>
        <strong>${escapeHtml(point.parentPreview || point.parentId)}</strong>
        <small>${point.childIds.length} 条路径</small>
      </button>`)
    .join('');

  elements.branchList.querySelectorAll('[data-branch-index]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedBranchIndex = Number(button.dataset.branchIndex);
      renderBranchList(graph);
      renderBranchComparison(graph);
    });
  });
}

function renderBranchComparison(graph) {
  const point = graph.branchPoints[state.selectedBranchIndex];
  if (!point) {
    elements.branchComparison.innerHTML = '<div class="empty-state compact">选择一个分叉点</div>';
    return;
  }

  const messages = new Map(graph.messages.map((message) => [message.id, message]));
  const parent = messages.get(point.parentId);
  const columns = [...point.childIds]
    .sort((left, right) => Number(right === point.activeChildId) - Number(left === point.activeChildId))
    .map((id) => messages.get(id))
    .filter(Boolean)
    .map((message) => branchColumn(message, message.id === point.activeChildId))
    .join('');

  elements.branchComparison.innerHTML = `
    <header class="comparison-head">
      <div><span>分叉 ${state.selectedBranchIndex + 1}</span><h2>${escapeHtml(point.parentPreview || '未命名分叉')}</h2></div>
      <code>${escapeHtml(point.parentId)}</code>
    </header>
    <details class="parent-context">
      <summary>分叉前消息</summary>
      <div class="message-text">${escapeHtml(parent?.contentMarkdown || '')}</div>
    </details>
    <div class="comparison-columns">${columns}</div>`;
}

function branchColumn(message, active) {
  return `<section class="branch-column ${active ? 'selected' : ''}" data-family="${modelFamily(message.model)}">
    <header>
      <div><span>${active ? '当前选择' : '替代分支'}</span><h3>${escapeHtml(displayModel(message.model || message.role))}</h3></div>
      <i class="model-dot"></i>
    </header>
    <p class="message-meta">${roleLabel(message.role)} · ${escapeHtml(message.createdAt || '时间未知')}</p>
    ${message.processMarkdown ? `<details><summary>思考 / 工具过程</summary><pre>${escapeHtml(message.processMarkdown)}</pre></details>` : ''}
    <div class="message-text">${escapeHtml(message.contentMarkdown || '(空消息)')}</div>
    <footer><code>${escapeHtml(message.id)}</code></footer>
  </section>`;
}

function renderMainline(graph) {
  const messages = new Map(graph.messages.map((message) => [message.id, message]));
  elements.mainlineList.innerHTML = graph.activePathIds
    .map((id, index) => {
      const message = messages.get(id);
      if (!message) return '';
      return `<article class="mainline-message" data-family="${modelFamily(message.model)}">
        <div class="message-index">${index + 1}</div>
        <div class="mainline-body">
          <header><strong>${roleLabel(message.role)}</strong><span>${escapeHtml(displayModel(message.model))}</span></header>
          ${message.processMarkdown ? `<details><summary>思考 / 工具过程</summary><pre>${escapeHtml(message.processMarkdown)}</pre></details>` : ''}
          <div class="message-text">${escapeHtml(message.contentMarkdown || '(空消息)')}</div>
        </div>
      </article>`;
    })
    .join('');
}

function renderAnnotations(doc) {
  elements.annotationList.innerHTML = '';
  if (!doc.blocks?.length) {
    elements.annotationList.innerHTML = '<div class="empty-state">暂无内容块</div>';
    return;
  }

  doc.blocks.forEach((block, index) => {
    const item = document.createElement('article');
    item.className = 'annotation-item';
    item.innerHTML = `
      <div class="annotation-head">
        <strong>${index + 1}. ${roleLabel(block.role) || block.type}</strong>
        <span>${escapeHtml(block.model || block.id)}</span>
      </div>
      <div class="annotation-content">${escapeHtml(block.contentMarkdown || '')}</div>
      <div class="annotation-fields">
        <label>意图<input data-label="intent" data-index="${index}" value="${escapeAttr(block.labels?.intent || '')}" /></label>
        <label>质量<select data-label="quality" data-index="${index}">
          ${option('unlabeled', '未标注', block.labels?.quality)}${option('gold', 'Gold', block.labels?.quality)}${option('silver', 'Silver', block.labels?.quality)}${option('bad', 'Bad', block.labels?.quality)}
        </select></label>
        <label>复用<select data-label="reusable" data-index="${index}">
          ${option('false', '否', String(Boolean(block.labels?.reusable)))}${option('true', '是', String(Boolean(block.labels?.reusable)))}
        </select></label>
        <label>备注<input data-label="notes" data-index="${index}" value="${escapeAttr(block.labels?.notes || '')}" /></label>
      </div>`;
    elements.annotationList.append(item);
  });

  elements.annotationList.querySelectorAll('[data-label]').forEach((input) => {
    input.addEventListener('input', updateLabel);
    input.addEventListener('change', updateLabel);
  });
}

function updateLabel(event) {
  const index = Number(event.target.dataset.index);
  const key = event.target.dataset.label;
  const block = state.result.document.blocks[index];
  block.labels = block.labels || {};
  block.labels[key] = key === 'reusable' ? event.target.value === 'true' : event.target.value;
  elements.jsonOutput.value = JSON.stringify(state.result.graph ? { graph: state.result.graph, document: state.result.document } : state.result.document, null, 2);
  elements.jsonlOutput.value = buildJsonl(state.result.document);
}

async function loadSiderProfiles() {
  try {
    const response = await fetch('/api/sider/profiles');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '扫描失败');
    elements.profileSelect.innerHTML = data.profiles.length
      ? data.profiles.map((profile) => `<option value="${escapeAttr(profile.id)}">${escapeHtml(profile.label)}</option>`).join('')
      : '<option value="">未发现 Sider</option>';
    if (data.profiles.length) await loadSiderConversations();
  } catch {
    elements.profileSelect.innerHTML = '<option value="">扫描失败</option>';
  }
}

async function loadSiderConversations(showStatus = false) {
  const profile = elements.profileSelect.value;
  if (!profile) return;
  elements.detectSiderButton.disabled = true;
  elements.detectedChat.innerHTML = '<span>正在检测</span><strong>读取 Chrome 中的 Sider 会话</strong>';
  if (showStatus) setStatus('正在检测');

  try {
    const response = await fetch(`/api/sider/conversations?profile=${encodeURIComponent(profile)}&limit=30`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '检测失败');
    state.siderChats = data.chats || [];
    elements.siderChatSelect.innerHTML = state.siderChats.length
      ? state.siderChats.map((chat) => `<option value="${escapeAttr(chat.id)}" ${chat.isCurrent ? 'selected' : ''}>${chat.isCurrent ? '【当前选中】' : ''}${escapeHtml(shortText(chat.title, 42))} · ${chat.messageCount} 条</option>`).join('')
      : '<option value="">没有找到本地会话</option>';
    renderSelectedSiderChat();
    if (showStatus) setStatus('检测完成');
  } catch (error) {
    state.siderChats = [];
    elements.siderChatSelect.innerHTML = '<option value="">检测失败</option>';
    elements.detectedChat.innerHTML = `<span>检测失败</span><strong>${escapeHtml(error.message || '无法读取 Sider')}</strong>`;
    setStatus(error.message || '检测失败');
  } finally {
    elements.detectSiderButton.disabled = false;
  }
}

async function loadObsidianVaults(showStatus = false) {
  if (showStatus) setStatus('正在扫描 Obsidian Vault');
  elements.refreshVaultsButton.disabled = true;
  try {
    const response = await fetch('/api/obsidian/vaults');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '扫描失败');
    state.obsidianVaults = data.vaults || [];
    const savedPath = localStorage.getItem('wanwu.obsidian.vaultPath') || '';
    elements.obsidianVaultSelect.innerHTML = state.obsidianVaults.length
      ? ['<option value="">手工路径</option>', ...state.obsidianVaults.map((vault) => `<option value="${escapeAttr(vault.path)}">${escapeHtml(vault.name)}</option>`)].join('')
      : '<option value="">未检测到 Vault</option>';
    const matchedVault = state.obsidianVaults.find((vault) => vault.path === savedPath) || state.obsidianVaults[0];
    if (!elements.obsidianVaultPath.value && matchedVault) {
      elements.obsidianVaultSelect.value = matchedVault.path;
      elements.obsidianVaultPath.value = matchedVault.path;
    } else if (savedPath) {
      elements.obsidianVaultSelect.value = state.obsidianVaults.some((vault) => vault.path === savedPath) ? savedPath : '';
    }
    if (showStatus) setStatus(state.obsidianVaults.length ? '已扫描 Obsidian Vault' : '未检测到 Vault');
  } catch (error) {
    elements.obsidianVaultSelect.innerHTML = '<option value="">扫描失败</option>';
    if (showStatus) setStatus(error.message || 'Obsidian 扫描失败');
  } finally {
    elements.refreshVaultsButton.disabled = false;
  }
}

function loadObsidianSettings() {
  elements.obsidianVaultPath.value = localStorage.getItem('wanwu.obsidian.vaultPath') || '';
  elements.obsidianFolder.value = localStorage.getItem('wanwu.obsidian.folder') || elements.obsidianFolder.value;
}

function saveObsidianSettings() {
  localStorage.setItem('wanwu.obsidian.vaultPath', elements.obsidianVaultPath.value.trim());
  localStorage.setItem('wanwu.obsidian.folder', elements.obsidianFolder.value.trim());
}

async function exportToObsidian(button) {
  if (!state.result) {
    setStatus('请先完成一次采集');
    return;
  }

  saveObsidianSettings();
  const vaultPath = elements.obsidianVaultPath.value.trim() || elements.obsidianVaultSelect.value;
  if (!vaultPath) {
    setStatus('请选择或填写 Obsidian 仓库路径');
    return;
  }

  button.disabled = true;
  setStatus('正在写入 Obsidian');
  try {
    const response = await fetch('/api/obsidian/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vaultPath,
        folder: elements.obsidianFolder.value.trim(),
        includeJson: elements.obsidianIncludeJson.checked,
        includeDataset: elements.obsidianIncludeDataset.checked,
        includeReport: elements.obsidianIncludeReport.checked,
        markdown: elements.markdownOutput.value,
        json: elements.jsonOutput.value,
        jsonl: elements.jsonlOutput.value,
        reportHtml: state.result.reportHtml || '',
        document: state.result.document,
        graph: state.result.graph
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '写入失败');
    elements.fileOutput.textContent = `Obsidian：${data.notePath}`;
    setStatus('已存入 Obsidian');
  } catch (error) {
    setStatus(error.message || 'Obsidian 写入失败');
  } finally {
    button.disabled = false;
  }
}

function renderSelectedSiderChat() {
  const chat = state.siderChats.find((item) => item.id === elements.siderChatSelect.value);
  if (!chat) {
    elements.detectedChat.innerHTML = '<span>未检测到</span><strong>请先在 Chrome 的 Sider 中打开一段对话</strong>';
    return;
  }

  elements.detectedChat.innerHTML = `
    <span>${chat.isCurrent ? 'Chrome 当前选中' : '已选择历史对话'}</span>
    <strong>${escapeHtml(chat.title)}</strong>
    <small>${chat.messageCount} 条消息${chat.updatedAt ? ` · 更新于 ${escapeHtml(formatDate(chat.updatedAt))}` : ''}</small>`;
}

function setSource(source) {
  state.source = source;
  document.querySelectorAll('.source-switch button').forEach((button) => button.classList.toggle('active', button.dataset.source === source));
  document.querySelectorAll('[data-source-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.sourcePanel === source));
  if (source === 'sider' && !state.siderChats.length) loadSiderConversations();
}

function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === `${tab}-panel`));
}

function setGraphMode(mode) {
  state.graphMode = mode;
  document.querySelectorAll('[data-graph-mode]').forEach((button) => button.classList.toggle('active', button.dataset.graphMode === mode));
  document.querySelectorAll('.graph-view').forEach((view) => view.classList.toggle('active', view.id === `${mode}-view`));
}

function currentText() {
  if (!state.result) return '';
  if (state.activeTab === 'report') return state.result.reportHtml || '';
  if (state.activeTab === 'json') return elements.jsonOutput.value;
  if (state.activeTab === 'dataset') return elements.jsonlOutput.value;
  return elements.markdownOutput.value;
}

function buildJsonl(doc) {
  return (doc.blocks || [])
    .map((block, index) => JSON.stringify({
      source: doc.source,
      document: { title: doc.title, kind: doc.kind, adapter: doc.adapter, capturedAt: doc.capturedAt },
      block: {
        index: index + 1,
        id: block.id,
        type: block.type,
        role: block.role,
        model: block.model,
        content: block.contentMarkdown,
        process: block.processMarkdown,
        attachments: block.attachments,
        links: block.links,
        metadata: block.metadata
      },
      labels: block.labels || {}
    }))
    .join('\n');
}

function summaryMetric(label, value) {
  return `<div><span>${label}</span><strong>${new Intl.NumberFormat('zh-CN').format(value || 0)}</strong></div>`;
}

function shortText(value, length) {
  const text = String(value || '未命名对话').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function displayModel(model = '') {
  if (!model) return '未知模型';
  return model.replace(/[-_]+/g, ' ').replace(/\b(gpt|glm|ai)\b/gi, (value) => value.toUpperCase()).replace(/\b\w/g, (value) => value.toUpperCase());
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

function roleLabel(role) {
  return role === 'user' ? '用户' : role === 'assistant' ? '助手' : role === 'system' ? '系统' : role === 'tool' ? '工具' : role || '消息';
}

function downloadText(text, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function safeFilename(value) {
  return String(value || 'capture').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, '-').slice(0, 80);
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function option(value, label, current) {
  return `<option value="${value}" ${String(current || 'unlabeled') === value ? 'selected' : ''}>${label}</option>`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

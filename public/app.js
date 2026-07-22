const state = {
  activeTab: 'graph',
  source: 'web',
  language: localStorage.getItem('wanwu-language') || 'zh',
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

elements.languageSelect = document.querySelector('#language-select');

const I18N = {
  zh: {
    'brand.title': '万物 Markdown',
    'brand.tagline': '一键生成 Markdown、美观报告和结构化资产',
    'download.app': '下载 App',
    'download.note': '免费开源，本地优先',
    'feature.assets': '沉淀数字资产',
    'feature.assetsText': '把网页和对话保存成自己的资料库。',
    'feature.agent': 'Agent 优先格式',
    'feature.agentText': 'Markdown、JSON、JSONL 都方便继续读取。',
    'feature.report': '视觉采集报告',
    'feature.reportText': '长对话分支可以被看见、比较和复盘。',
    'source.web': '网页文章',
    'source.ai': 'AI 对话',
    'source.plugin': '浏览器插件',
    'source.import': '导入文件',
    'web.noteTitle': '文章 URL 从哪里来',
    'web.note': '打开微信公众号文章、X 帖文或普通网页，复制浏览器地址栏里的链接，粘贴到下方。',
    'web.url': '文章 URL',
    'web.urlPlaceholder': 'https://mp.weixin.qq.com/s/... 或 https://x.com/.../status/...',
    'web.adapter': '适配器',
    'web.submit': '开始采集',
    'ai.noteTitle': 'AI 对话 URL 怎么拿',
    'ai.note': 'Claude、ChatGPT、Gemini、Codex 网页对话：打开目标对话后，复制浏览器地址栏里的链接。想免 URL：浏览器插件可以直接读取 Sider；Claude、ChatGPT、Codex 这类云端对话需要先打开网页、使用官方导出或授权 API。',
    'ai.url': '对话页面 URL',
    'ai.urlPlaceholder': 'https://claude.ai/chat/... 或 https://chatgpt.com/...',
    'ai.adapter': '大模型来源',
    'ai.submit': '采集 AI 对话',
    'plugin.noteTitle': '浏览器插件',
    'plugin.note': '当前支持：Sider 插件。Sider 插件不用 URL，先在 Chrome 的 Sider 中打开目标对话，再点击下方“重新检测”。',
    'plugin.profile': 'Chrome 配置',
    'plugin.detect': '重新检测当前对话',
    'plugin.detecting': '正在检测',
    'plugin.waiting': '等待读取 Sider 当前对话',
    'plugin.target': '目标对话',
    'plugin.manual': '高级：手工输入会话 ID',
    'plugin.chatId': '会话 ID',
    'plugin.chatIdPlaceholder': '通常无需填写',
    'plugin.submit': '恢复所选对话',
    'import.noteTitle': '导入文件是什么场景',
    'import.note': '不用先理解 JSON，可以把它理解成“可恢复的存档文件”。适合导入历史采集结果、别人给你的结构化对话或开发者数据，例如 conversation.graph.json；训练标注数据通常看 dataset.jsonl。',
    'import.choose': '选择导入文件',
    'import.support': '支持 JSON、messages 与 conversation graph',
    'import.submit': '导入文件',
    'common.advanced': '高级设置',
    'common.saveAssets': '保存图片',
    'common.includeProcess': '过程 / 工具',
    'common.visibleBrowser': '显示浏览器',
    'adapter.auto': '自动',
    'adapter.wechat': '微信公众号文章',
    'adapter.x': 'X 文章 / 帖文',
    'adapter.siderShare': 'Sider 分享页',
    'adapter.genericPage': '普通网页',
    'adapter.claude': 'Claude 对话',
    'adapter.codex': 'Codex 对话',
    'adapter.chatgpt': 'ChatGPT 对话',
    'adapter.gemini': 'Gemini 对话',
    'adapter.otherLlm': '其他大模型对话',
    'adapter.genericChat': '通用对话',
    'status.state': '状态',
    'status.idle': '待处理',
    'status.kind': '类型',
    'status.blocks': '消息 / 块',
    'status.branches': '分叉点',
    'obsidian.title': 'Obsidian 输出',
    'obsidian.refresh': '刷新 Vault',
    'obsidian.detected': '已检测 Vault',
    'obsidian.path': '仓库路径',
    'obsidian.pathPlaceholder': '/Users/你/Documents/Obsidian',
    'obsidian.folder': '保存目录',
    'obsidian.folderDefault': '万物Markdown/采集资产',
    'obsidian.reportFile': '分支报告',
    'obsidian.submit': '存入 Obsidian',
    'tabs.graph': '分支',
    'tabs.report': '报告',
    'tabs.json': '结构数据',
    'tabs.annotate': '标注',
    'tabs.dataset': '训练数据',
    'toolbar.noFile': '暂无输出文件',
    'toolbar.report': '生成分支报告',
    'toolbar.copy': '复制',
    'toolbar.download': '下载',
    'empty.title': '尚未载入对话图',
    'empty.body': '读取浏览器插件会话、网页链接或导入文件',
    'graph.branches': '分支对比',
    'graph.mainline': '当前主分支',
    'markdown.placeholder': '采集结果会出现在这里'
  },
  en: {
    'brand.title': 'Everything Markdown',
    'brand.tagline': 'Markdown, visual reports, and agent-ready archives.',
    'download.app': 'Download app',
    'download.note': 'Free, open source, local-first',
    'feature.assets': 'Personal digital assets',
    'feature.assetsText': 'Turn web pages and chats into your own archive.',
    'feature.agent': 'Agent-ready Markdown',
    'feature.agentText': 'Markdown, JSON, and JSONL stay easy to read later.',
    'feature.report': 'Visual branch reports',
    'feature.reportText': 'See, compare, and review long conversation branches.',
    'source.web': 'Web pages',
    'source.ai': 'AI chats',
    'source.plugin': 'Browser plugin',
    'source.import': 'Import file',
    'web.noteTitle': 'Where the article URL comes from',
    'web.note': 'Open a WeChat article, X post, or regular web page, then paste the address bar URL here.',
    'web.url': 'Article URL',
    'web.urlPlaceholder': 'https://mp.weixin.qq.com/s/... or https://x.com/.../status/...',
    'web.adapter': 'Adapter',
    'web.submit': 'Capture',
    'ai.noteTitle': 'How to get an AI chat URL',
    'ai.note': 'For Claude, ChatGPT, Gemini, or Codex web chats, open the target conversation and copy the address bar URL. To skip URLs, the browser plugin path can read Sider locally. Cloud chats still need an open page, official export, or authorized API.',
    'ai.url': 'Chat page URL',
    'ai.urlPlaceholder': 'https://claude.ai/chat/... or https://chatgpt.com/...',
    'ai.adapter': 'Model source',
    'ai.submit': 'Capture AI chat',
    'plugin.noteTitle': 'Browser plugin',
    'plugin.note': 'Currently supports Sider. No URL is needed: open the target Sider chat in Chrome, then click Detect again.',
    'plugin.profile': 'Chrome profile',
    'plugin.detect': 'Detect current chat',
    'plugin.detecting': 'Detecting',
    'plugin.waiting': 'Waiting for the current Sider chat',
    'plugin.target': 'Target chat',
    'plugin.manual': 'Advanced: enter chat ID manually',
    'plugin.chatId': 'Chat ID',
    'plugin.chatIdPlaceholder': 'Usually not needed',
    'plugin.submit': 'Recover selected chat',
    'import.noteTitle': 'When to import a file',
    'import.note': 'You do not need to understand JSON first. Think of it as a recoverable archive file: past captures, structured conversations, or developer exports such as conversation.graph.json. Training drafts usually use dataset.jsonl.',
    'import.choose': 'Choose import file',
    'import.support': 'Supports JSON, messages, and conversation graph',
    'import.submit': 'Import file',
    'common.advanced': 'Advanced settings',
    'common.saveAssets': 'Save images',
    'common.includeProcess': 'Process / tools',
    'common.visibleBrowser': 'Show browser',
    'adapter.auto': 'Auto',
    'adapter.wechat': 'WeChat article',
    'adapter.x': 'X article / post',
    'adapter.siderShare': 'Sider share page',
    'adapter.genericPage': 'Generic page',
    'adapter.claude': 'Claude chat',
    'adapter.codex': 'Codex chat',
    'adapter.chatgpt': 'ChatGPT chat',
    'adapter.gemini': 'Gemini chat',
    'adapter.otherLlm': 'Other LLM chat',
    'adapter.genericChat': 'Generic chat',
    'status.state': 'Status',
    'status.idle': 'Idle',
    'status.kind': 'Kind',
    'status.blocks': 'Messages / blocks',
    'status.branches': 'Branch points',
    'obsidian.title': 'Obsidian output',
    'obsidian.refresh': 'Refresh vaults',
    'obsidian.detected': 'Detected vault',
    'obsidian.path': 'Vault path',
    'obsidian.pathPlaceholder': '/Users/you/Documents/Obsidian',
    'obsidian.folder': 'Folder',
    'obsidian.folderDefault': 'EverythingMarkdown/captures',
    'obsidian.reportFile': 'Branch report',
    'obsidian.submit': 'Save to Obsidian',
    'tabs.graph': 'Branches',
    'tabs.report': 'Report',
    'tabs.json': 'Data',
    'tabs.annotate': 'Labels',
    'tabs.dataset': 'Dataset',
    'toolbar.noFile': 'No output yet',
    'toolbar.report': 'Build branch report',
    'toolbar.copy': 'Copy',
    'toolbar.download': 'Download',
    'empty.title': 'No conversation graph loaded',
    'empty.body': 'Read a browser plugin chat, capture a URL, or import a file',
    'graph.branches': 'Branch comparison',
    'graph.mainline': 'Current mainline',
    'markdown.placeholder': 'Capture output will appear here'
  }
};

const STATUS_TRANSLATIONS = {
  已复制: 'Copied',
  采集中: 'Capturing',
  正在采集: 'Capturing',
  '正在采集 AI 对话': 'Capturing AI chat',
  正在恢复: 'Recovering',
  正在检测: 'Detecting',
  检测完成: 'Detection complete',
  检测失败: 'Detection failed',
  '正在扫描 Obsidian Vault': 'Scanning Obsidian vaults',
  '已扫描 Obsidian Vault': 'Obsidian vaults scanned',
  '未检测到 Vault': 'No vault detected',
  'Obsidian 扫描失败': 'Obsidian scan failed',
  '请先完成一次采集': 'Capture something first',
  '请选择或填写 Obsidian 仓库路径': 'Choose or enter an Obsidian vault path',
  '正在写入 Obsidian': 'Writing to Obsidian',
  '已存入 Obsidian': 'Saved to Obsidian',
  'Obsidian 写入失败': 'Obsidian write failed',
  请选择文件: 'Choose a file',
  '请选择 JSON': 'Choose a JSON file',
  正在导入: 'Importing',
  导入失败: 'Import failed',
  处理失败: 'Processing failed',
  已完成: 'Done',
  报告已生成: 'Report built',
  待处理: 'Idle'
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
elements.languageSelect.addEventListener('change', () => {
  state.language = elements.languageSelect.value;
  localStorage.setItem('wanwu-language', state.language);
  applyLanguage();
});

elements.jsonFileInput.addEventListener('change', () => {
  state.selectedJsonFile = elements.jsonFileInput.files?.[0] || null;
  elements.jsonFileName.textContent = state.selectedJsonFile?.name || t('import.choose');
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

applyLanguage();
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
      : `<option value="">${escapeHtml(state.language === 'en' ? 'Sider not found' : '未发现 Sider')}</option>`;
    if (data.profiles.length) await loadSiderConversations();
  } catch {
    elements.profileSelect.innerHTML = `<option value="">${escapeHtml(state.language === 'en' ? 'Scan failed' : '扫描失败')}</option>`;
  }
}

async function loadSiderConversations(showStatus = false) {
  const profile = elements.profileSelect.value;
  if (!profile) return;
  elements.detectSiderButton.disabled = true;
  elements.detectedChat.innerHTML =
    state.language === 'en'
      ? '<span>Detecting</span><strong>Reading Sider conversations from Chrome</strong>'
      : '<span>正在检测</span><strong>读取 Chrome 中的 Sider 会话</strong>';
  if (showStatus) setStatus('正在检测');

  try {
    const response = await fetch(`/api/sider/conversations?profile=${encodeURIComponent(profile)}&limit=30`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '检测失败');
    state.siderChats = data.chats || [];
    elements.siderChatSelect.innerHTML = state.siderChats.length
      ? state.siderChats
          .map((chat) => {
            const current = chat.isCurrent ? (state.language === 'en' ? '[Current] ' : '【当前选中】') : '';
            const unit = state.language === 'en' ? 'messages' : '条';
            return `<option value="${escapeAttr(chat.id)}" ${chat.isCurrent ? 'selected' : ''}>${current}${escapeHtml(shortText(chat.title, 42))} · ${chat.messageCount} ${unit}</option>`;
          })
          .join('')
      : `<option value="">${escapeHtml(state.language === 'en' ? 'No local chats found' : '没有找到本地会话')}</option>`;
    renderSelectedSiderChat();
    if (showStatus) setStatus('检测完成');
  } catch (error) {
    state.siderChats = [];
    elements.siderChatSelect.innerHTML = `<option value="">${escapeHtml(state.language === 'en' ? 'Detection failed' : '检测失败')}</option>`;
    elements.detectedChat.innerHTML = `<span>${escapeHtml(state.language === 'en' ? 'Detection failed' : '检测失败')}</span><strong>${escapeHtml(error.message || (state.language === 'en' ? 'Unable to read Sider' : '无法读取 Sider'))}</strong>`;
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
      ? [`<option value="">${escapeHtml(state.language === 'en' ? 'Manual path' : '手工路径')}</option>`, ...state.obsidianVaults.map((vault) => `<option value="${escapeAttr(vault.path)}">${escapeHtml(vault.name)}</option>`)].join('')
      : `<option value="">${escapeHtml(state.language === 'en' ? 'No vault detected' : '未检测到 Vault')}</option>`;
    const matchedVault = state.obsidianVaults.find((vault) => vault.path === savedPath) || state.obsidianVaults[0];
    if (!elements.obsidianVaultPath.value && matchedVault) {
      elements.obsidianVaultSelect.value = matchedVault.path;
      elements.obsidianVaultPath.value = matchedVault.path;
    } else if (savedPath) {
      elements.obsidianVaultSelect.value = state.obsidianVaults.some((vault) => vault.path === savedPath) ? savedPath : '';
    }
    if (showStatus) setStatus(state.obsidianVaults.length ? '已扫描 Obsidian Vault' : '未检测到 Vault');
  } catch (error) {
    elements.obsidianVaultSelect.innerHTML = `<option value="">${escapeHtml(state.language === 'en' ? 'Scan failed' : '扫描失败')}</option>`;
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
    elements.detectedChat.innerHTML =
      state.language === 'en'
        ? '<span>Not detected</span><strong>Open a Sider chat in Chrome first</strong>'
        : '<span>未检测到</span><strong>请先在 Chrome 的 Sider 中打开一段对话</strong>';
    return;
  }

  elements.detectedChat.innerHTML = `
    <span>${escapeHtml(chat.isCurrent ? (state.language === 'en' ? 'Chrome current chat' : 'Chrome 当前选中') : state.language === 'en' ? 'Selected history chat' : '已选择历史对话')}</span>
    <strong>${escapeHtml(chat.title)}</strong>
    <small>${chat.messageCount} ${escapeHtml(state.language === 'en' ? 'messages' : '条消息')}${chat.updatedAt ? ` · ${escapeHtml(state.language === 'en' ? 'updated ' : '更新于 ')}${escapeHtml(formatDate(chat.updatedAt))}` : ''}</small>`;
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

function t(key) {
  return I18N[state.language]?.[key] || I18N.zh[key] || key;
}

function applyLanguage() {
  elements.languageSelect.value = state.language;
  document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
  document.title = t('brand.title');
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-value]').forEach((node) => {
    const key = node.dataset.i18nValue;
    const current = node.value.trim();
    const knownValues = Object.values(I18N).map((messages) => messages[key]).filter(Boolean);
    if (!current || knownValues.includes(current)) node.value = t(key);
  });
  if (!state.selectedJsonFile) elements.jsonFileName.textContent = t('import.choose');
  if (!state.result) {
    elements.statusText.textContent = t('status.idle');
    elements.fileOutput.textContent = t('toolbar.noFile');
  }
}

function setStatus(text) {
  elements.statusText.textContent = state.language === 'en' ? STATUS_TRANSLATIONS[text] || text : text;
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

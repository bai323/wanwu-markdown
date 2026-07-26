const statusEl = document.querySelector('#status');

document.querySelector('#copy').addEventListener('click', async () => {
  const payload = await extractFromTab();
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  statusEl.textContent = payload.platform === 'x' ? `已复制 ${payload.posts.length} 条` : '已复制当前页面信息';
});

document.querySelector('#send').addEventListener('click', async () => {
  const payload = await extractFromTab();
  const target = payload.platform === 'x' ? '/api/x/import' : '/api/capture';
  const body = payload.platform === 'x'
    ? payload
    : {
        url: payload.sourceUrl,
        adapter: payload.platform === 'wechat' ? 'wechat-article' : 'auto',
        saveAssets: true,
        includeProcess: true
      };
  const response = await fetch(`http://localhost:4173${target}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '发送失败');
  statusEl.textContent = payload.platform === 'x' ? `已发送 ${payload.posts.length} 条` : '已发送当前文章';
});

async function extractFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
  return chrome.tabs.sendMessage(tab.id, { type: 'WANWU_EXTRACT_ACTIVE' });
}

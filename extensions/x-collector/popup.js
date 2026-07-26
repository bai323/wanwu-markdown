const statusEl = document.querySelector('#status');

document.querySelector('#copy').addEventListener('click', async () => {
  const payload = await extractFromTab();
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  statusEl.textContent = `已复制 ${payload.posts.length} 条`;
});

document.querySelector('#send').addEventListener('click', async () => {
  const payload = await extractFromTab();
  const response = await fetch('http://localhost:4173/api/x/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '发送失败');
  statusEl.textContent = `已发送 ${payload.posts.length} 条`;
});

async function extractFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
  return chrome.tabs.sendMessage(tab.id, { type: 'WANWU_EXTRACT_X' });
}

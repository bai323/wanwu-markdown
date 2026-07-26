function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

if (!window.__wanwuCollectorInstalled) {
  window.__wanwuCollectorInstalled = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'WANWU_EXTRACT_ACTIVE') return false;
    sendResponse(extractActivePage());
    return true;
  });
}

function detectPlatform() {
  if (/mp\.weixin\.qq\.com/i.test(location.hostname)) return 'wechat';
  if (/(^|\.)x\.com$|(^|\.)twitter\.com$/i.test(location.hostname)) return 'x';
  return 'webpage';
}

function extractActivePage() {
  const platform = detectPlatform();
  if (platform === 'x') return extractVisibleXPosts();
  if (platform === 'wechat') return extractWechatArticle();
  return {
    platform,
    sourceUrl: location.href,
    title: document.title || location.href
  };
}

function visibleCollection() {
  const path = location.pathname;
  if (/bookmarks/i.test(path)) return 'bookmarks';
  if (/likes/i.test(path)) return 'likes';
  return 'visible';
}

function extractVisibleXPosts() {
  const posts = [];
  const seen = new Set();

  for (const article of document.querySelectorAll('article[data-testid="tweet"], article')) {
    const text = clean(article.innerText);
    const statusLink = Array.from(article.querySelectorAll('a[href*="/status/"]'))
      .map((link) => new URL(link.getAttribute('href'), location.origin).href)
      .find(Boolean);
    if (!text || !statusLink || seen.has(statusLink)) continue;
    seen.add(statusLink);

    const userName = clean(article.querySelector('[data-testid="User-Name"]')?.innerText || '');
    const handle = userName.match(/@([A-Za-z0-9_]+)/)?.[1] || '';
    const authorName = userName.split('@')[0]?.trim() || handle;
    const media = Array.from(article.querySelectorAll('img[src*="twimg.com/media"], img[src*="pbs.twimg.com/media"]'))
      .map((img) => ({
        type: 'image',
        url: img.currentSrc || img.src,
        name: img.alt || 'x-media',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0
      }))
      .filter((item) => item.url);
    const links = Array.from(article.querySelectorAll('a[href^="http"]'))
      .map((link) => ({ text: clean(link.innerText) || link.href, href: link.href }))
      .filter((link) => !/\/status\//.test(link.href));

    posts.push({
      id: statusLink.split('/status/')[1]?.split(/[/?#]/)[0] || statusLink,
      url: statusLink,
      authorName,
      authorHandle: handle,
      text,
      createdAt: article.querySelector('time')?.getAttribute('datetime') || '',
      media,
      links
    });
  }

  return {
    platform: 'x',
    source: 'browser-extension',
    collection: visibleCollection(),
    sourceUrl: location.href,
    capturedAt: new Date().toISOString(),
    posts
  };
}

function extractWechatArticle() {
  const title = clean(document.querySelector('#activity-name')?.innerText || document.querySelector('h1')?.innerText || document.title);
  const author = clean(document.querySelector('#js_name')?.innerText || document.querySelector('.profile_nickname')?.innerText || '');
  const publishedAt = clean(document.querySelector('#publish_time')?.innerText || '');

  return {
    platform: 'wechat',
    source: 'browser-extension',
    sourceUrl: location.href,
    title,
    author,
    publishedAt
  };
}

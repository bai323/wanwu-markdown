export function browserExtractPage(options = {}) {
  const sourceUrl = location.href;
  const requested = options.adapter || 'auto';
  const includeProcess = options.includeProcess !== false;

  function clean(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  function inlineChildren(node) {
    return Array.from(node.childNodes)
      .map(inlineText)
      .join('')
      .replace(/[ \t]+/g, ' ');
  }

  function inlineText(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'code' && node.parentElement?.tagName?.toLowerCase() !== 'pre') {
      return '`' + node.textContent.replace(/`/g, '\\`') + '`';
    }
    if (tag === 'strong' || tag === 'b') return '**' + inlineChildren(node).trim() + '**';
    if (tag === 'em' || tag === 'i') return '*' + inlineChildren(node).trim() + '*';
    if (tag === 'a') {
      const text = inlineChildren(node).trim() || node.href || '';
      if (!node.href || node.href === sourceUrl || text.startsWith('ref:')) return text;
      return `[${text.replace(/[[\]]/g, '')}](${node.href})`;
    }
    if (tag === 'img') {
      const src = node.currentSrc || node.src || node.getAttribute('src') || '';
      const alt = node.alt || '图片';
      return src ? `![${alt}](${src})` : '';
    }
    return inlineChildren(node);
  }

  function blockChildren(node) {
    return Array.from(node.childNodes).map(blockNode).join('');
  }

  function blockNode(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      return text ? text + '\n\n' : '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'svg', 'noscript', 'template'].includes(tag)) return '';
    if (tag.match(/^h[1-6]$/)) return `${'#'.repeat(Number(tag.slice(1)))} ${inlineChildren(node).trim()}\n\n`;
    if (tag === 'p') return clean(inlineChildren(node)) + '\n\n';
    if (tag === 'blockquote') {
      return clean(blockChildren(node))
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n') + '\n\n';
    }
    if (tag === 'pre') return '```\n' + node.innerText.replace(/\n+$/g, '') + '\n```\n\n';
    if (tag === 'ul' || tag === 'ol') return listMarkdown(node, tag === 'ol');
    if (tag === 'table') return tableMarkdown(node);
    if (tag === 'img') return inlineText(node) + '\n\n';
    if (tag === 'br') return '\n';
    return blockChildren(node);
  }

  function listMarkdown(list, ordered) {
    return Array.from(list.children)
      .filter((child) => child.tagName?.toLowerCase() === 'li')
      .map((li, index) => {
        const prefix = ordered ? `${index + 1}. ` : '- ';
        const content = clean(blockChildren(li));
        const lines = content.split('\n');
        return prefix + lines.map((line, lineIndex) => (lineIndex === 0 ? line : ' '.repeat(prefix.length) + line)).join('\n');
      })
      .join('\n') + '\n\n';
  }

  function tableMarkdown(table) {
    const rows = Array.from(table.querySelectorAll('tr'))
      .map((row) =>
        Array.from(row.children)
          .filter((cell) => /^(td|th)$/i.test(cell.tagName))
          .map((cell) => inlineChildren(cell).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim())
      )
      .filter((row) => row.length);

    if (!rows.length) return '';
    const width = Math.max(...rows.map((row) => row.length));
    const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ''));
    return [normalized[0], Array.from({ length: width }, () => '---'), ...normalized.slice(1)]
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n') + '\n\n';
  }

  function markdownFrom(node) {
    return clean(blockChildren(node));
  }

  function externalLinks(root) {
    const seen = new Set();
    return Array.from(root.querySelectorAll('a'))
      .map((link) => ({ text: clean(link.innerText) || link.href, href: link.href }))
      .filter((link) => link.href && link.href !== sourceUrl && !link.text.startsWith('ref:'))
      .filter((link) => {
        if (seen.has(link.href)) return false;
        seen.add(link.href);
        return true;
      });
  }

  function imageAttachments(root) {
    return Array.from(root.querySelectorAll('img'))
      .map((img) => ({
        type: 'image',
        name: img.alt || '附件图片',
        url: img.currentSrc || img.src || img.getAttribute('src') || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0
      }))
      .filter((image) => image.url && (image.width > 96 || image.height > 96 || image.url.includes('file-cdn.')));
  }

  function choose(hints) {
    const normalizedUrl = sourceUrl.toLowerCase();
    const title = String(document.title || '').toLowerCase();
    if (requested && requested !== 'auto') return requested;
    if (hints.hasSiderMessages || /sider\.ai\/.*\/share\//i.test(sourceUrl)) return 'sider-share';
    if (/mp\.weixin\.qq\.com\/s/i.test(sourceUrl)) return 'wechat-article';
    if (/(^https?:\/\/)?(www\.)?(x|twitter)\.com\/.+\/status\/\d+/i.test(sourceUrl) || /x\.com\/i\/article\//i.test(sourceUrl)) return 'x-article';
    if (/claude\.ai\/(chat|project|new)/i.test(sourceUrl) || hints.hasClaudeMessages) return 'claude-chat';
    if (/(chatgpt\.com|chat\.openai\.com)/i.test(normalizedUrl) && (title.includes('codex') || /\/codex\b/i.test(normalizedUrl))) return 'codex-chat';
    if (/(chatgpt\.com|chat\.openai\.com)/i.test(sourceUrl) || hints.hasChatGptMessages) return 'chatgpt-chat';
    if (/gemini\.google\.com/i.test(sourceUrl) || hints.hasGeminiMessages) return 'gemini-chat';
    if (/kimi\.com\/chat\//i.test(sourceUrl) || hints.hasKimiMessages) return 'kimi-chat';
    if ((hints.messageCount || 0) >= 2 || hints.hasChatLikeStructure) return 'generic-chat';
    return 'generic-page';
  }

  function extractSider() {
    const items = Array.from(document.querySelectorAll('[class*="share-message-item"]'));
    const blocks = items.map((item, index) => {
      const userNode = item.querySelector('.user-input-text');
      const answerNode = item.querySelector('.share-chat .markdown-body');
      const userText = clean(userNode?.innerText || '');
      const model = Array.from(item.querySelectorAll('span'))
        .map((span) => clean(span.innerText))
        .find((text) => /^(GPT|Gemini|Claude|DeepSeek|Grok)/i.test(text)) || '';
      const attachments = imageAttachments(item);
      const fullText = clean(item.innerText);

      if (userNode) {
        const beforeUser = userText && fullText.includes(userText) ? clean(fullText.slice(0, fullText.indexOf(userText))) : '';
        if (/\.(pdf|docx?|xlsx?|pptx?|csv|txt|md)\b/i.test(beforeUser)) {
          attachments.unshift({
            type: 'file',
            name: beforeUser.replace(/\n/g, ' · '),
            url: '',
            mimeType: ''
          });
        }

        return {
          id: `block-${index + 1}`,
          type: 'message',
          role: 'user',
          contentMarkdown: userText,
          attachments
        };
      }

      const processMarkdown = includeProcess ? clean(fullText.replace(model, '').replace(answerNode?.innerText || '', '')) : '';
      return {
        id: `block-${index + 1}`,
        type: 'message',
        role: 'assistant',
        model,
        contentMarkdown: answerNode ? markdownFrom(answerNode) : '',
        processMarkdown,
        links: externalLinks(item)
      };
    });

    return blocks.filter((block) => clean(block.contentMarkdown));
  }

  function extractGenericChat() {
    const roleNodes = Array.from(document.querySelectorAll('[data-message-author-role], [data-testid*="conversation-turn"], [class*="message"]'))
      .filter((node) => clean(node.innerText).length > 0);

    const blocks = roleNodes.map((node, index) => {
      const roleHint = node.getAttribute('data-message-author-role') || node.getAttribute('data-testid') || node.className || '';
      const role = /user|human|request/i.test(roleHint) ? 'user' : /assistant|model|answer|response/i.test(roleHint) ? 'assistant' : index % 2 === 0 ? 'user' : 'assistant';
      return {
        id: `block-${index + 1}`,
        type: 'message',
        role,
        contentMarkdown: markdownFrom(node),
        links: externalLinks(node),
        attachments: imageAttachments(node)
      };
    });

    return blocks.filter((block) => clean(block.contentMarkdown).length > 10);
  }

  function extractLlmChat(adapter) {
    const selector = [
      '[data-message-author-role]',
      '[data-testid*="conversation-turn"]',
      '[data-testid*="message"]',
      '[data-is-streaming]',
      '[class*="font-claude-message"]',
      '[class*="chat-message"]',
      '[class*="message-item"]',
      '[class*="segment-content"]',
      '[class*="message"]',
      'article'
    ].join(', ');
    const seen = new Set();
    const nodes = Array.from(document.querySelectorAll(selector))
      .filter((node) => {
        const text = clean(node.innerText);
        if (text.length < 8) return false;
        if (seen.has(text)) return false;
        seen.add(text);
        return true;
      });

    const blocks = nodes.map((node, index) => {
      const roleHint = [
        node.getAttribute('data-message-author-role'),
        node.getAttribute('data-testid'),
        node.getAttribute('aria-label'),
        node.className
      ].join(' ');
      const role = /user|human|request|prompt|you|question/i.test(roleHint) ? 'user' : /assistant|model|answer|response|claude|gpt|gemini|codex|kimi/i.test(roleHint) ? 'assistant' : index % 2 === 0 ? 'user' : 'assistant';
      return {
        id: `block-${index + 1}`,
        type: 'message',
        role,
        model: adapterModel(adapter, node),
        contentMarkdown: markdownFrom(node),
        links: externalLinks(node),
        attachments: imageAttachments(node),
        metadata: {
          adapter
        }
      };
    });

    return blocks.filter((block) => clean(block.contentMarkdown).length > 10);
  }

  function adapterModel(adapter, node) {
    const text = clean(node.innerText).slice(0, 500);
    const explicit = text.match(/\b(Claude\s+[A-Za-z0-9.\s-]+|GPT[-\s]?[0-9A-Za-z.]+|Gemini\s+[A-Za-z0-9.\s-]+|Codex)\b/i)?.[0] || '';
    if (explicit) return clean(explicit);
    if (adapter === 'claude-chat') return 'Claude';
    if (adapter === 'codex-chat') return 'Codex';
    if (adapter === 'chatgpt-chat') return 'ChatGPT';
    if (adapter === 'gemini-chat') return 'Gemini';
    if (adapter === 'kimi-chat') return 'Kimi';
    return '大模型';
  }

  function extractWechatArticle() {
    const root = document.querySelector('#js_content') || document.querySelector('.rich_media_content') || document.querySelector('article') || document.body;
    const title = clean(document.querySelector('#activity-name')?.innerText || document.querySelector('h1')?.innerText || document.title);
    const author = clean(document.querySelector('#js_name')?.innerText || document.querySelector('.profile_nickname')?.innerText || '');
    const publishedAt = clean(document.querySelector('#publish_time')?.innerText || '');
    const metadata = { author, publishedAt };

    return [
      {
        id: 'block-1',
        type: 'content',
        title,
        contentMarkdown: markdownFrom(root),
        links: externalLinks(root),
        attachments: imageAttachments(root),
        metadata
      }
    ].filter((block) => clean(block.contentMarkdown));
  }

  function extractXArticle() {
    const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"], article'))
      .filter((node) => clean(node.innerText).length > 10);

    if (!tweets.length) return extractGenericPage();

    return tweets.map((tweet, index) => {
      const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
      const author = clean(tweet.querySelector('[data-testid="User-Name"]')?.innerText || '');
      return {
        id: `block-${index + 1}`,
        type: 'content',
        title: author ? `X 帖文：${author.split('\n')[0]}` : `X 帖文 ${index + 1}`,
        contentMarkdown: markdownFrom(tweet),
        links: externalLinks(tweet),
        attachments: imageAttachments(tweet),
        metadata: {
          author,
          publishedAt: time
        }
      };
    });
  }

  function extractGenericPage() {
    const clone = (document.querySelector('article') || document.querySelector('main') || document.body).cloneNode(true);
    clone.querySelectorAll('nav, header, footer, aside, script, style, noscript, svg, form, button').forEach((node) => node.remove());
    return [
      {
        id: 'block-1',
        type: 'content',
        title: document.querySelector('h1')?.innerText || document.title || '网页内容',
        contentMarkdown: markdownFrom(clone),
        links: externalLinks(clone),
        attachments: imageAttachments(clone)
      }
    ].filter((block) => clean(block.contentMarkdown));
  }

  const hints = {
    hasSiderMessages: Boolean(document.querySelector('[class*="share-message-item"]')),
    hasClaudeMessages: Boolean(document.querySelector('[class*="font-claude-message"], [data-testid*="claude"]')),
    hasChatGptMessages: Boolean(document.querySelector('[data-message-author-role], [data-testid*="conversation-turn"]')),
    hasGeminiMessages: Boolean(document.querySelector('[data-test-id*="conversation"], message-content')),
    hasKimiMessages: Boolean(document.querySelector('[class*="chat-message"], [class*="message-item"], [class*="segment-content"], [class*="markdown"]')),
    messageCount: document.querySelectorAll('[data-message-author-role], [data-testid*="conversation-turn"], [class*="message"], [class*="font-claude-message"], [class*="segment-content"]').length,
    title: document.title
  };
  const adapter = choose(hints);
  const llmAdapters = ['claude-chat', 'codex-chat', 'chatgpt-chat', 'gemini-chat', 'kimi-chat', 'generic-llm-chat'];
  const blocks = adapter === 'sider-share'
    ? extractSider()
    : adapter === 'wechat-article'
      ? extractWechatArticle()
      : adapter === 'x-article'
        ? extractXArticle()
        : llmAdapters.includes(adapter)
          ? extractLlmChat(adapter)
          : adapter === 'generic-chat'
            ? extractGenericChat()
            : extractGenericPage();
  const pageTitle = document.querySelector('#activity-name')?.innerText?.trim() || document.title.replace(/^Chat Share:\s*/, '').replace(/\s*\|\s*Sider$/, '').trim() || document.querySelector('h1')?.innerText || sourceUrl;

  return {
    title: pageTitle,
    sourceUrl,
    adapter,
    kind: ['sider-share', 'generic-chat', 'claude-chat', 'codex-chat', 'chatgpt-chat', 'gemini-chat', 'kimi-chat', 'generic-llm-chat'].includes(adapter) ? 'conversation' : 'webpage',
    metadata: {
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      hints
    },
    links: externalLinks(document.body),
    assets: imageAttachments(document.body),
    blocks
  };
}

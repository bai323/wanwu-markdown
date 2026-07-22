import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'public', 'scripts', 'test'];
const jsFiles = [];

for (const root of roots) {
  await collect(root);
}

const issues = [];
for (const file of jsFiles) {
  const content = await readFile(file, 'utf8');
  if (/\t/.test(content)) issues.push(`${file}: 包含 tab 缩进`);
  if (/[ \t]+$/m.test(content)) issues.push(`${file}: 包含行尾空格`);
  if (file.startsWith('src/') && /console\.log/.test(content)) issues.push(`${file}: 生产代码包含 console.log`);
}

if (issues.length) {
  process.stderr.write(issues.join('\n') + '\n');
  process.exit(1);
}

process.stdout.write(`Lint 通过：${jsFiles.length} 个文件\n`);

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) {
      jsFiles.push(path);
    }
  }
}

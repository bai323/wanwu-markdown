import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const requiredFiles = [
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'src/server.js',
  'src/capture/chrome.js',
  'src/capture/browser-extractor.js',
  'src/core/schema.js',
  'src/core/extractors.js',
  'src/core/conversation-graph.js',
  'src/core/conversation-report.js',
  'src/core/conversation-export.js',
  'src/importers/sider-local.js'
];

for (const file of requiredFiles) {
  await access(file);
}

await checkSyntax([
  'public/app.js',
  'src/server.js',
  'src/capture/chrome.js',
  'src/capture/browser-extractor.js',
  'src/core/schema.js',
  'src/core/extractors.js',
  'src/core/conversation-graph.js',
  'src/core/conversation-report.js',
  'src/core/conversation-export.js',
  'src/importers/sider-local.js',
  'scripts/lint.js'
]);
await import('../src/core/schema.js');
await import('../src/core/extractors.js');
await import('../src/core/conversation-graph.js');
await import('../src/core/conversation-report.js');

process.stdout.write('构建检查通过\n');

function checkSyntax(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ['--check', file], { stdio: 'pipe' });
          let stderr = '';
          child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
          });
          child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${file} 语法检查失败\n${stderr}`));
          });
        })
    )
  );
}

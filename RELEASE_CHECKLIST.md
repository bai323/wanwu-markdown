# 第一次发布到 GitHub

这份清单给第一次发布产品的人用。按顺序走一遍即可，不需要一次做得很完美。

## 发布前

- [ ] README 能说明这个项目是什么、怎么运行、适合谁用。
- [ ] LICENSE 已添加。
- [ ] PRIVACY.md 已说明本地数据和使用边界。
- [ ] `.gitignore` 已排除本地采集结果、临时文件和隐私材料。
- [ ] `npm test` 通过。
- [ ] `npm run build` 通过。
- [ ] `npm run lint` 通过。
- [ ] 首页截图没有明显文字遮挡、空白区域或错位。

## 创建仓库

- [ ] 在 GitHub 创建一个新仓库，建议名称：`wanwu-markdown`。
- [ ] 初次发布可以先选择 Public，但不要上传私人采集结果。
- [ ] 仓库描述可以写：`把网页、AI 对话和浏览器插件内容整理成 Markdown 的本地工作台。`

## 推送代码

```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/wanwu-markdown.git
git push -u origin main
```

如果 GitHub 提示登录，按浏览器或终端提示完成授权。

## 发布后

- [ ] 打开 GitHub Actions，确认 CI 通过。
- [ ] 检查 README 在网页上的排版。
- [ ] 创建第一个 Release，版本号建议 `v0.1.0`。
- [ ] 在 issue 里记录下一版计划，例如更多插件、更多导出格式、采集失败诊断。

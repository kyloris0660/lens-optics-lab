# 发布到 GitHub Pages

本项目不需要打包服务或第三方部署平台。`docs/` 已包含可直接发布的完整静态站点。

## 第一次发布

1. 创建公开仓库 `lens-optics-lab`，将项目文件提交到 `main` 分支。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
4. Branch 选择 **main**，目录选择 **/docs**，点击 **Save**。
5. 等待 GitHub 完成 Pages 构建；查看 Pages 页面给出的站点链接。

此仓库的预期站点地址是 `https://kyloris0660.github.io/lens-optics-lab/`。是否上线以 Pages 的构建状态和实际访问结果为准。

GitHub 官方说明：
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 后续更新

编辑 `src/` 后运行 `python build.py`、两个 Node 验证脚本及 `python check-build.py`。将源码和更新后的 `docs/` 一起提交到 `main`；GitHub Pages 会重新发布该目录。

`docs/.nojekyll` 用于按静态文件发布。站点所有资源使用相对路径，兼容项目站点的 `/lens-optics-lab/` 前缀，也兼容本地 `file://` 打开。

## Fork 后发布

在自己的仓库按同样方式开启 `main /docs`。将 README、首页中的仓库/在线使用链接改为自己的 GitHub 用户名和仓库名，再重新构建。

## 验收

- 首页能分别进入教程和实验室，并能互相返回。
- 教程切换球差/彗差/像散时，波前、PSF、测试靶和数值都更新。
- 实验室切换球面/非球面/双胶合时，光路、点列图与指标都更新。
- 下载离线版并完整解压，断网后打开 `index.html`，确认两页均可交互。

如果 Pages 返回 404，先查看 Pages 的构建状态、`main /docs` 设置和该分支下的 `docs/index.html`，不要通过修改模型代码排查部署问题。

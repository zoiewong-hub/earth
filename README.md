# Cinematic Earth · 交互式地球

直接打开：**https://zoiewong-hub.github.io/earth/**

当前维护版本位于 `main`。恢复基线为 2026-03-10 17:09（北京时间）合并的 PR #12，提交 `b9b3d8535c1c66fef62b111c3df9475288695ea0`；2026-11-05 在此版本上修复资源加载造成的黑屏。

## 使用

拖动旋转，滚轮或双指缩放。底部按钮提供自动旋转、脉冲、银河环带、流星雨、城市灯火、极光扫描和视角重置。快捷键：M 流星雨、C 城市灯火、G 极光、R 重置。

网页现在从本仓库加载全部脚本和地球贴图，不依赖第三方 CDN。贴图读取失败或超过 8 秒时使用原有程序生成纹理；启动失败会显示提示。

## 目录

- `index.html`、`style.css`：页面与样式。
- `js/`：原有地球、场景、交互及启动错误提示。
- `assets/`：真实地球贴图，已替换文字占位文件。
- `vendor/`：固定版本的 Three.js 0.162.0、后期效果与 GSAP 3.12.5。
- `tests/browser-check.mjs`：真实浏览器回归检查。
- `VERSION_HISTORY.md`：版本关系与恢复说明。
- `THIRD_PARTY.md`：第三方资源来源与许可说明。

## 本地预览与检查

使用任意静态 HTTP 服务打开仓库根目录，例如安装 Python 后执行 `python -m http.server 8000`，访问 `http://localhost:8000/`。请通过 HTTP 访问，浏览器直接双击 HTML 文件会限制 JavaScript 模块加载。

浏览器回归检查使用 Node.js 22+ 和已开启远程调试端口 `9224` 的独立 Chrome 测试实例：

```text
node tests/browser-check.mjs http://localhost:8000/ screenshot.png offline-dependencies
node tests/browser-check.mjs http://localhost:8000/ fallback.png stalled-textures
node tests/browser-check.mjs http://localhost:8000/ error.png failed-boot
```

第一项阻断外部 CDN，确认真实画面、按钮和尺寸切换；第二项令贴图请求一直等待，验证超时后能绘制备用纹理；第三项阻断启动依赖，验证失败提示。检查脚本连接专用测试浏览器的第一个页面，请勿用于日常浏览器。

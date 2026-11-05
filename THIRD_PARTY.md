# 第三方资源

依赖版本与原网页一致，仅改为从同一站点提供文件。

## Three.js 0.162.0

源码：https://github.com/mrdoob/three.js/tree/r162

脚本由 jsDelivr 的对应固定版本 ESM 产物保存，模块导入改为本地相对路径：`three.js`、`EffectComposer.js`、`RenderPass.js`、`UnrealBloomPass.js`、`BokehPass.js`。许可见 `vendor/THREE-LICENSE.txt`。

贴图保存自同版本 `examples/textures/planets/`，未生成或替换地理内容：

| 本地文件 | 上游文件 |
| --- | --- |
| `assets/earth_day.jpg` | `earth_atmos_2048.jpg` |
| `assets/earth_night.jpg` | `earth_lights_2048.png`（保持原尺寸，转为 JPEG 以减少下载体积） |
| `assets/earth_normal.jpg` | `earth_normal_2048.jpg` |
| `assets/earth_specular.jpg` | `earth_specular_2048.jpg` |
| `assets/earth_clouds.png` | `earth_clouds_1024.png` |

## GSAP 3.12.5

来源：https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm

原始库版权声明：Copyright 2008–2024, GreenSock. All rights reserved. 使用受 https://gsap.com/standard-license 或相应 Club GSAP 协议约束。版权声明另见 `vendor/GSAP-NOTICE.txt`。

# 第三方开源组件

TimeMaster V2 的当前构建输入和发布产物包含第三方开源软件。本文件归纳直接运行时依赖；各项目随仓库保存的完整许可证文本具有优先效力。

## 直接依赖

| 组件 | 锁定版本 | 用途 | 许可证与完整文本 |
|---|---:|---|---|
| [Vue.js](https://github.com/vuejs/core) | 3.5.40 | renderer UI 运行时 | MIT — [完整许可证](LICENSES/Vue-3.5.40-LICENSE.txt) |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | 1.7.7 | 农历、节气与传统日历计算 | MIT — [完整许可证](LICENSES/lunar-javascript-1.7.7-LICENSE.txt) |
| [Electron](https://github.com/electron/electron) | 43.2.0 | Windows 桌面运行时与原生 API | MIT — [完整许可证](LICENSES/Electron-43.2.0-LICENSE.txt) |

版权归各上游作者和贡献者所有，包括但不限于：

- Vue.js：Copyright (c) 2018-present, Yuxi (Evan) You；
- lunar-javascript：Copyright (c) 2018 6tail；
- Electron：Copyright (c) Electron contributors；Copyright (c) 2013-2020 GitHub Inc.

直接版本同时锁定在 `package.json` 和 `package-lock.json`。renderer 的 0.1.3 黄金参考中包含原构建打包后的 Vue 和 lunar-javascript 运行时代码；当前 source-equivalent 构建仍显式声明这些依赖，以便审计版本和许可证来源。

## Electron 随附组件

Electron 二进制分发还包含 Chromium、V8、FFmpeg 及其他第三方组件。Electron 生成/随附的 `LICENSE.electron.txt` 与 `LICENSES.chromium.html` 是对应二进制分发许可证材料的一部分，应与打包应用一起保留。本仓库中的 Electron MIT 文本不能替代这些随二进制提供的第三方许可证清单。

## 构建工具

开发和打包使用 electron-vite、Vite、electron-builder 及其锁定的传递依赖。它们由 `package-lock.json` 记录，并不全部进入最终应用运行时代码。重新分发构建产物时，应以实际生成包内的许可证材料和对应依赖版本为准。

如果发现许可证文本、版本或版权归属不一致，请通过 [GitHub Issues](https://github.com/bigelephant-code/TimeMasterV2/issues) 提交具体证据和受影响文件。

# 架构说明

## 进程边界

```text
Renderer (主窗口 / 小组件)
        │ contextBridge 白名单
        ▼
Preload
        │ ipcRenderer.invoke / events
        ▼
Main process
        ├─ 本地 JSON 数据仓库与备份
        ├─ 窗口、托盘和原生通知
        ├─ 专注与提醒调度
        └─ 费用台账 Excel 导出
```

渲染层没有直接 Node.js 权限。任何文件、窗口或系统能力必须先加入 `runtime/preload/index.js` 的明确白名单，再由主进程注册对应 IPC 处理器。

## 数据

应用显式把 `userData` 指向 `%APPDATA%\timemaster-v2\`。主要数据采用 JSON，写入时使用临时文件和替换策略，并保留可恢复备份。数据模型版本为 3。

主要实体：

- lists：待办清单；
- todos：待办、起止时间、重复、提醒和耗时；
- goals：目标、周期累计或费用台账；
- expenses：台账明细；
- focus：专注计时状态与完成记录；
- settings：主题、窗口、小组件、天气和时间节点设置。

## 外部服务

只有天气模块会访问外部服务：

- `https://api.open-meteo.com`
- `https://geocoding-api.open-meteo.com`

对应域名同时列在小组件页面的 Content Security Policy 中。核心任务数据不会发送给天气服务。

## 产品身份

TimeMaster V2 与 LiteCal V1 使用不同的 npm 名称、App ID 和用户数据目录。该隔离用于避免安装冲突和用户数据互相覆盖，属于数据安全边界，不应随意改回统一名称。

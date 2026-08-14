import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { join } from 'node:path'

const root = process.cwd()
const main = readFileSync(join(root, 'src', 'main', 'index.js'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload', 'index.js'), 'utf8')
const coachModule = readFileSync(join(root, 'src', 'main', 'ai-task-coach.js'), 'utf8')
const bundledRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'styles-4HYtOQXD.js'), 'utf8')
const mainRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'index-DQb7weSm.js'), 'utf8')
const mainStyles = readFileSync(join(root, 'src', 'renderer', 'assets', 'styles-Bi0oHDKn.css'), 'utf8')
const expenseStyles = readFileSync(join(root, 'src', 'renderer', 'assets', 'index-DMAWqcRK.css'), 'utf8')
const widgetRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'widget-DirRFNEv.js'), 'utf8')
const widgetStyles = readFileSync(join(root, 'src', 'renderer', 'assets', 'widget-BT2CLSvv.css'), 'utf8')
const viteConfig = readFileSync(join(root, 'electron.vite.config.mjs'), 'utf8')
const verifyBuild = readFileSync(join(root, 'scripts', 'verify-build.mjs'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const matches = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1])

test('every preload request channel has a trusted main-process handler', () => {
  const requested = [...new Set(matches(preload, /ipcRenderer\.invoke\("([^"]+)"/g))].sort()
  const handled = [...new Set(matches(main, /handleTrusted\("([^"]+)"/g))].sort()
  assert.equal(requested.length, 57)
  assert.deepEqual(handled, requested)
})

test('every main-process module a sibling requires is an emitted build entry', () => {
  // 主进程模块之间的相对 require 在产物里原样保留，因此每个被 require 的模块
  // 都必须是独立的 rollup input，否则打包后的应用启动即崩。此前
  // gateway-direct-send.js 正是漏登记后才在构建阶段暴露出来的。
  const required = new Set()
  for (const file of readdirSync(join(root, 'src', 'main')).filter((name) => name.endsWith('.js'))) {
    const source = readFileSync(join(root, 'src', 'main', file), 'utf8')
    for (const target of matches(source, /require\("\.\/([^"]+)\.js"\)/g)) required.add(target)
  }
  assert.ok(required.size >= 8, '主进程模块数量异常，检查这条断言是否已经失效')

  for (const name of [...required].sort()) {
    assert.match(viteConfig, new RegExp(`'${name}': r\\('src/main/${name}\\.js'\\)`), `${name} 未登记进 electron.vite.config`)
    assert.ok(verifyBuild.includes(`out/main/${name}.js`), `${name} 未列入 verify-build 的必需产物`)
  }
})

test('renderer event subscriptions are emitted by the main process', () => {
  const subscribed = [...new Set(matches(preload, /ipcRenderer\.on\("([^"]+)"/g))].sort()
  const emitted = [...new Set(matches(main, /(?:broadcast|webContents\.send)\("([^"]+)"/g))].sort()
  assert.deepEqual(subscribed, ['app:navigate', 'data:changed', 'settings:changed'])
  for (const channel of subscribed) assert.ok(emitted.includes(channel), `Missing emitter: ${channel}`)
})

test('security and product identity invariants stay explicit', () => {
  assert.equal(pkg.main, './out/main/index.js')
  assert.equal(pkg.build.appId, 'com.timemaster.v2')
  assert.equal(pkg.build.productName, '时间大师')
  assert.equal(pkg.build.win.executableName, 'TimeMaster')
  assert.equal(pkg.build.nsis.shortcutName, '时间大师')
  assert.equal(pkg.build.artifactName, 'TimeMaster-Setup-${version}.${ext}')
  for (const notice of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'LICENSES/**/*', 'PRIVACY.md']) {
    assert.ok(pkg.build.files.includes(notice), `Packaged app is missing required notice: ${notice}`)
  }
  assert.match(main, /setAppUserModelId\("com\.timemaster\.v2"\)/)
  assert.match(main, /"timemaster-v2"/)
  assert.equal((main.match(/sandbox: true/g) || []).length, 3)
  assert.equal((main.match(/contextIsolation: true/g) || []).length, 3)
  assert.equal((main.match(/nodeIntegration: false/g) || []).length, 3)
  assert.match(main, /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/)
  assert.match(main, /Rejected IPC from an untrusted sender/)
  assert.match(main, /--timemaster-smoke-test/)
  assert.match(main, /KeyboardEvent\('keydown', \{ key: 'Escape'/)
  assert.match(main, /if \(!categoryDialogClosed\) throw new Error/)
  assert.match(main, /if \(!widget\) throw new Error\("桌面小组件未创建，打包烟测不能继续。"\)/)
  assert.doesNotMatch(main, /!widgetResult \|\|/)
  assert.match(main, /if \(patch\.endTime !== void 0 \|\| patch\.time !== void 0\) todo\.endTime = taskEndTime\(patch\)/)
  assert.match(main, /function taskReminderTime\(todo\) \{\s*return taskStartTime\(todo\) \|\| taskEndTime\(todo\);/)
  assert.match(main, /electron\.safeStorage\.encryptString\(value\)/)
  assert.match(main, /ensureMainWindowSender\(event\)/)
  assert.doesNotMatch(main, /if \(!electron\.Notification\.isSupported\(\)\) \{\s*if \(rolledOver\)/)
  assert.match(preload, /remoteReminder: \{/)
  assert.match(bundledRenderer, /\{ id: 10, name: "提前 10 分钟" \}/)
})

test('remote reminders keep tokens and delivery state out of renderer snapshots', () => {
  const remotePublic = main.slice(main.indexOf('function publicRemoteReminderConfig()'), main.indexOf('function saveRemoteReminderConfig'))
  assert.doesNotMatch(remotePublic, /token:/)
  assert.match(main, /remoteReminderHookToken: electron\.safeStorage\.encryptString/)
  assert.match(main, /function rendererSettings\(\) \{\s*const \{ remoteReminder: _remoteReminder, aiTaskCoach: _aiTaskCoach, \.\.\.visible \} = settings;/)
  assert.match(main, /handleTrusted\("settings:get", \(\) => rendererSettings\(\)\)/)
  assert.match(main, /delete safePatch\.remoteReminder/)
  assert.match(main, /remote-reminder-outbox\.json/)
  assert.match(main, /queueRemoteReminder\(todo, dueAt, fireAt, now\)/)
  assert.match(main, /new electron\.Notification\([\s\S]*?\)\.show\(\)/)
  assert.match(main, /void drainRemoteReminderQueue\(\)/)
  assert.match(main, /OpenClaw 已受理测试提醒；请到 QQ 确认是否最终收到。/)
  assert.doesNotMatch(main, /QQ 已发送|QQ 已收到/)
  assert.match(viteConfig, /'remote-reminders': r\('src\/main\/remote-reminders\.js'\)/)
  assert.match(verifyBuild, /out\/main\/remote-reminders\.js/)
  const tickSource = main.slice(main.indexOf('function tick()'), main.indexOf('function focusTick()'))
  assert.ok(tickSource.indexOf('new electron.Notification') < tickSource.indexOf('queueRemoteReminder(todo, dueAt, fireAt, now)'))
  assert.match(tickSource, /try \{\s*queueRemoteReminder\(todo, dueAt, fireAt, now\);\s*\} catch/)
  assert.match(main, /input\.enabled !== true && \["pending", "retry", "attempting"\]\.includes\(item\.status\)/)
  assert.match(main, /body: JSON\.stringify\(\{ agentId: "timemaster-reminders" \}\)/)
  assert.match(main, /const item = remoteReminderOutbox\.items\.find/)
  assert.match(main, /if \(liveItem\?\.status === "attempting"\)/)
  assert.match(main, /if \(!config\.enabled\) throw new Error\("请先启用并保存 QQ Bot 主提醒。"\)/)
  assert.match(main, /REMOTE_REMINDER_TEST_COOLDOWN_MS/)
  assert.match(main, /redirect: "error"/)
})

test('AI task coach keeps its operator credential and mutations behind trusted main IPC', () => {
  const aiPublic = main.slice(main.indexOf('function publicAiTaskCoachConfig()'), main.indexOf('function saveAiTaskCoachConfig'))
  assert.doesNotMatch(aiPublic, /token:/)
  assert.match(main, /aiTaskCoachGatewayToken: electron\.safeStorage\.encryptString/)
  assert.match(main, /delete safePatch\.aiTaskCoach/)
  assert.match(main, /handleTrusted\("aiCoach:getConfig"/)
  assert.match(main, /handleTrusted\("aiCoach:saveConfig"/)
  assert.match(main, /handleTrusted\("aiCoach:planTask"/)
  assert.match(main, /handleTrusted\("aiCoach:planDay"/)
  assert.match(main, /handleTrusted\("aiCoach:applyDayPlan"/)
  assert.match(main, /handleTrusted\("aiCoach:undoDayPlan"/)
  assert.match(main, /handleTrusted\("aiCoach:openLink"/)
  assert.match(main, /plan\.status !== "applied" \|\| !Array\.isArray\(plan\.undo\?\.items\)/)
  assert.match(main, /\.\.\.\(plan\.undo\?\.items \|\| \[\]\)/)
  assert.match(main, /plan\.date === date && plan\.status === "applied" && !plan\.undoneAt/)
  assert.match(main, /const appliedWhilePlanning = data\.aiTaskCoach\.dayPlans\.find/)
  assert.match(main, /AI 生成期间已有排程被应用，本次新草案未保存/)
  assert.match(main, /start: input\.workdayStart \?\? input\.workday\?\.start/)
  assert.match(main, /start: input\.lunchStart \?\? input\.lunch\?\.start/)
  assert.match(main, /if \(url\.protocol !== "https:" \|\| url\.username \|\| url\.password\) throw new Error/)
  assert.match(main, /await electron\.shell\.openExternal\(url\.toString\(\), \{ activate: true \}\)/)
  assert.match(main, /function secretTokensMatch\(left, right\)[\s\S]*?node_crypto\.timingSafeEqual\(leftBuffer, rightBuffer\)/)
  assert.match(main, /secretTokensMatch\(effectiveRemoteToken, readAiTaskCoachToken\(\)\)/)
  assert.match(main, /secretTokensMatch\(effectiveAiToken, readRemoteReminderToken\(\)\)/)
  assert.match(viteConfig, /'ai-task-coach': r\('src\/main\/ai-task-coach\.js'\)/)
  assert.match(verifyBuild, /out\/main\/ai-task-coach\.js/)
  assert.match(mainRenderer, /AI 安排今天/)
  assert.match(mainRenderer, /保存后自动生成 AI 拆解/)
  assert.match(mainRenderer, /AI 任务教练/)
  // 自动拆解已由主进程在 todo:create 上决定，renderer 不再参与判断。
  assert.match(main, /void autoPlanCreatedTodo\(r\)/)
  assert.match(mainRenderer, /class: "coach-source-host"[\s\S]*?linkHost\(link\.url\)/)
  assert.match(mainStyles, /\.coach-source-host/)
  assert.match(bundledRenderer, /const isMainRenderer = \/\(\?:\^\|\\\/\)index\\\.html\$\/i\.test\(window\.location\.pathname\)/)
  assert.match(bundledRenderer, /isMainRenderer \? api\.aiCoach\?\.getConfig\?\.\(\)\.catch\(\(\) => null\) : Promise\.resolve\(null\)/)
  const createTodoHandler = main.slice(main.indexOf('handleTrusted("todo:create"'), main.indexOf('handleTrusted("todo:update"'))
  assert.doesNotMatch(createTodoHandler, /planTodoWithAi/)
  assert.match(mainStyles, /\.ai-coach-drawer/)
})

test('bundled lunar suffix checks reject lastIndexOf minus-one false positives', () => {
  assert.match(bundledRenderer, /size >= _SIZE && \(size < keySize \|\| size - keySize !== left\.lastIndexOf\(key\)\)/)
  assert.match(bundledRenderer, /size >= keySize && size - keySize === s\.lastIndexOf\(key\)/)
})

test('data v4 migration is gated and backed up before normalization', () => {
  const initStore = main.slice(main.indexOf('function initStore()'), main.indexOf('function migrateTodoTimes()'))
  assert.match(main, /function createPreV4Backup\(value\)/)
  assert.match(main, /flag: "wx"/)
  assert.match(initStore, /if \(sourceDataVersion > DATA_VERSION\) \{\s*throw new Error/)
  assert.ok(initStore.indexOf('createPreV4Backup(data)') < initStore.indexOf('if (!Array.isArray(data.lists))'))
  assert.doesNotMatch(main, /writeJsonAtomic\(dataFile, backup\)/)
  assert.match(main, /whenReady\(\)\.then\(bootstrap\)\.catch/)
})

test('ledger mode transitions seed categories without adding empty catalogs to other goals', () => {
  assert.match(main, /\.\.\.\(mode === "ledger" \? \{ expenseCategories: defaultExpenseCategories\(input\.catNames\) \} : \{\}\)/)
  assert.match(main, /const previousMode = goal\.mode/)
  assert.match(main, /goal\.mode === "ledger" && \(previousMode !== "ledger" \|\| !Array\.isArray\(goal\.expenseCategories\) \|\| goal\.expenseCategories\.length === 0\)/)
  assert.match(main, /migrateExpenseCategories\(goal, data\.expenses\)/)
})

test('expense workbook formulas and XML preserve opaque category ids safely', () => {
  assert.match(main, /const expenseCategoryGroupLabel = \(category\) => category\?\.group === "cogs" \? "货款单列" : category\?\.group === "opex" \? OPEX_LABEL : "遗留\/未分类"/)
  assert.ok(main.includes('SUMPRODUCT(--EXACT(${catCodeRange},A${row}))'))
  assert.ok(main.includes('SUMPRODUCT(--EXACT(${catCodeRange},A${row}),${amountRange})'))
  assert.match(main, /const categoryEndRow = Math\.max\(categoryStartRow, categoryStartRow \+ categories\.length - 1\)/)
  assert.match(main, /function sanitizeXmlText\(value\)/)
  assert.match(main, /codePoint === 9 \|\| codePoint === 10 \|\| codePoint === 13/)
  assert.match(main, /const escapeXml = \(value\) => sanitizeXmlText\(value\)/)
  assert.match(main, /function workbookCategoryKey\(value\)/)
  assert.match(main, /textCell\(row, 1, workbookCategoryKey\(cat\.id\), bodyStyle\)/)
  assert.match(main, /textCell\(row, 5, workbookCategoryKey\(cat\?\.id \?\? entry\.cat \?\? ""\)/)

  const sanitizerPattern = /function sanitizeXmlText\(value\) \{[\s\S]*?\r?\n\}/
  const escapePattern = /const escapeXml = \(value\) => .*?;\r?\n/
  const sanitizerSource = main.match(sanitizerPattern)?.[0]
  const escapeSource = main.match(escapePattern)?.[0]
  assert.ok(sanitizerSource && escapeSource, 'Could not load the production XML sanitizer')
  const crlfMain = main.replace(/\r?\n/g, '\r\n')
  assert.ok(crlfMain.match(sanitizerPattern)?.[0] && crlfMain.match(escapePattern)?.[0], 'XML sanitizer extraction must support CRLF checkouts')
  const productionEscapeXml = Function(`${sanitizerSource}\n${escapeSource}\nreturn escapeXml`)()
  assert.equal(
    productionEscapeXml(`safe\u0000\t\n\r&<>"'\ud800😀`),
    `safe\t\n\r&amp;&lt;&gt;&quot;&apos;😀`
  )

  const keySource = main.match(/function workbookCategoryKey\(value\) \{[\s\S]*?\r?\n\}/)?.[0]
  assert.ok(keySource, 'Could not load the production workbook category-key encoder')
  const productionWorkbookCategoryKey = Function(`${keySource}\nreturn workbookCategoryKey`)()
  const ids = ['control\u0001id', 'controlid', 'Case', 'case', '__proto__', '\ud800', '�']
  const keys = ids.map(productionWorkbookCategoryKey)
  assert.equal(new Set(keys).size, ids.length)
  for (const key of keys) assert.equal(productionEscapeXml(key), key)
})

test('expense category dialogs close after save and renderer dictionaries resist prototype ids', () => {
  assert.match(bundledRenderer, /const byCat = \/\* @__PURE__ \*\/ Object\.create\(null\)/)
  assert.match(mainRenderer, /const names = \/\* @__PURE__ \*\/ Object\.create\(null\)/)
  const saveSource = mainRenderer.slice(mainRenderer.indexOf('async function saveCatForm()'), mainRenderer.indexOf('async function addCategoryFromForm()'))
  assert.ok(saveSource.indexOf('catForm.value.busy = false;') < saveSource.indexOf('closeCatForm();'))
  const categoryActionsStart = mainRenderer.indexOf('class: "cat-dlg-actions-inline"')
  const categoryActions = mainRenderer.slice(categoryActionsStart, categoryActionsStart + 2_500)
  assert.ok(categoryActions.indexOf('c.group === "unclassified"') < categoryActions.indexOf('c.archivedAt ?'))
  assert.match(categoryActions, /"仅供查看"/)
})

test('calendar navigation selects the requested date before rendering history', () => {
  const navigation = mainRenderer.slice(mainRenderer.indexOf('function onNavigate(target)'), mainRenderer.indexOf('function onKey(e)'))
  assert.match(navigation, /target\?\.view === "calendar"/)
  assert.match(navigation, /state\.cursor = date/)
  assert.match(navigation, /state\.selected = date/)
  assert.match(navigation, /state\.view = "calendar"/)
})

test('expense category controls are exposed beside the actual ledger buttons only', () => {
  assert.match(mainRenderer, /编辑费用分类按钮/)
  assert.match(mainRenderer, /这里管理的就是“记一笔”区域中的费用分类按钮/)
  assert.match(mainRenderer, /删除分类不会删除账目/)
  assert.match(mainRenderer, /从记账按钮中删除，历史账目仍会保留/)
  assert.equal((mainRenderer.match(/onClick: openCatForm/g) || []).length, 1)
})

test('the reminder settings expose the direct bridge and label its credential correctly', () => {
  const cardSource = mainRenderer.slice(
    mainRenderer.indexOf('__name: "RemoteReminderSettings"'),
    mainRenderer.indexOf('__name: "RemoteReminderSettings"') + 12000
  )
  // 默认必须是 agent；直投是用户显式打开的选择，不能因为读取到脏值就启用。
  assert.match(cardSource, /mode: "agent"/)
  assert.match(cardSource, /mode: source\.mode === "direct" \? "direct" : "agent"/)
  assert.match(cardSource, /mode: draft\.value\.mode === "direct" \? "direct" : "agent"/)

  assert.match(cardSource, /"原文直投"/)
  assert.match(cardSource, /updateDraft\("mode", draft\.value\.mode === "direct" \? "agent" : "direct"\)/)
  // 两种模式需要的凭据不同，界面必须说清楚要填哪一个。
  assert.match(cardSource, /"Gateway operator Token" : "Hook Token"/)
  assert.match(cardSource, /operator Token；若此前保存的是 Hook Token/)
})

test('the reminder actions explain why they refuse instead of doing nothing', () => {
  // 前置条件不满足时静默 return，按钮点了毫无反应，用户无从判断卡在哪一步。
  const source = mainRenderer.slice(mainRenderer.indexOf('const runSavedAction'), mainRenderer.indexOf('const savedActionsReady'))
  assert.doesNotMatch(source, /if \(busy\.value \|\| loading\.value \|\| dirty\.value \|\| !tokenConfigured\.value\) return/)
  assert.match(source, /配置有未保存的改动，请先点「保存配置」。/)
  assert.match(source, /DEFAULT_GATEWAY_TOKEN/, '直投模式要直接写出正确凭据的取值位置')
  // 只有真正无法响应时才禁用按钮，否则用户看不到上面那些提示。
  assert.match(mainRenderer, /const savedActionsReady = \(\) => !loading\.value && !busy\.value;/)
})

test('nodes with dynamic text always declare the TEXT patch flag', () => {
  // block 更新只遍历 dynamicChildren，节点的 patchFlag 决定哪些部分会被 patch。
  // 动态文本却漏掉 TEXT(1) 时，文字冻在首次渲染的值：QQ 卡片的徽章永远显示
  // 「读取中」，而它的状态提示行冻在空串上——保存成功、保存失败、检查结果，
  // 这张卡说过的每句话都没显示出来，用户只能看到「点了没反应」。
  for (const [name, source] of [['index', mainRenderer], ['widget', widgetRenderer], ['styles', bundledRenderer]]) {
    source.split('\n').forEach((line, index) => {
      const trimmed = line.trim()
      // 只看字符串子节点：数组子节点由内层 createTextVNode 自行声明。
      // 两种写法都要覆盖：闭合在自己一行的，和整个节点写在一行的。
      const match = trimmed.match(/^\}, ([^[].*?), (\d+)(?:, \[[^\]]*\])?\)[,)]?$/)
        || trimmed.match(/^createBaseVNode\(".+?", \{.*\} ?, ([^[].*?), (\d+)(?:, \[[^\]]*\])?\)[,)]?$/)
      if (!match) return
      const [, child, flag] = match
      if (Number(flag) & 1) return
      const isDynamic = /\?|\.value|\(\)|\$\{|\+/.test(child)
      assert.ok(!isDynamic, `${name}:${index + 1} 的动态文本缺少 TEXT patchFlag（当前 ${flag}）：${trimmed.slice(0, 90)}`)
    })
  }
})

test('every toggle knob declares the CLASS patch flag so it can actually move', () => {
  // block 更新只遍历 dynamicChildren：patchFlag 为 0 的节点会被整个跳过，class
  // 停在首次渲染的值。编辑器里那个「保存后让 AI 拆解」开关就这样冻住过——点击
  // 确实翻转了状态，但滑块不动，用户以为没开，再点一次反而真的关掉了。
  // 该开关已随自动拆解下沉主进程而移除，但这条扫描要留住，防止别处再写漏。
  for (const [name, source] of [['index', mainRenderer], ['widget', widgetRenderer], ['styles', bundledRenderer]]) {
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (!/^createBaseVNode\("span", \{ class: normalizeClass\(\["toggle"/.test(trimmed)) return
      assert.match(trimmed, /\}, null, 2\)$/, `${name}:${index + 1} 的开关缺少 CLASS patchFlag：${trimmed.slice(0, 80)}`)
    })
  }
})

test('auto-planning a new todo is decided in the main process, not per renderer path', () => {
  // 判断曾经放在 renderer，四条创建路径各写一遍，接连出过两个 bug：小组件是
  // 独立 bundle 压根没接上，编辑器的开关又因缺 patchFlag 而冻死。现在整个下沉
  // 到 todo:create 这一条 IPC 上，创建来自哪个窗口都一样。
  assert.match(main, /function autoPlanNewTodoEnabled\(\)/)
  assert.match(main, /config\.enabled === true && config\.autoPlanNewTodos === true && !isSmokeTest/)
  const createHandler = main.slice(main.indexOf('handleTrusted("todo:create"'), main.indexOf('handleTrusted("todo:update"'))
  assert.match(createHandler, /void autoPlanCreatedTodo\(r\)/)

  // 子待办与冒烟测试数据走 repo.createTodo，不经过这条 IPC，因此不会触发拆解。
  assert.doesNotMatch(main, /autoPlanCreatedTodo\(todo\)[\s\S]{0,40}createStepTodos/)

  // renderer 不再有任何自动拆解判断，也不再有跨窗口唤起管道。
  for (const source of [mainRenderer, widgetRenderer]) {
    assert.doesNotMatch(source, /aiAutoPlanNewTodos/)
    assert.doesNotMatch(source, /autoPlanNewTodo\(/)
    assert.doesNotMatch(source, /aiCoachTodoId/)
    assert.doesNotMatch(source, /coachAfterSave/)
  }
  assert.doesNotMatch(widgetRenderer, /aiCoach\./)
})

test('pushing a plan to QQ is opt-in and only covers auto-generated plans', () => {
  // 这是一次外发，必须由用户显式开启，且不能被别的开关顺带打开。
  assert.match(coachModule, /sendPlanToQq: input\.sendPlanToQq === true/)
  assert.match(mainRenderer, /switchRow\("把拆解推送到 QQ"/)

  const autoPlanSource = main.slice(main.indexOf('async function autoPlanCreatedTodo'), main.indexOf('function todosForAiDay'))
  // 只有自动拆解这条路径会推送；手动拆解与重新生成不会。
  assert.match(autoPlanSource, /sendPlanToQq !== true\) return/)
  // QQ 未配置或 token 读不出来时安静跳过，绝不因此让拆解失败。
  assert.match(autoPlanSource, /const qq = planQqTargetConfig\(\);\s*if \(!qq\) return/)
  assert.match(main, /config\.enabled && config\.token && config\.target \? config : null/)
  // 拆解本身失败不能把异常带回渲染进程：待办已经创建成功了。
  assert.match(autoPlanSource, /console\.warn\("\[ai-auto-plan\]/)
  assert.doesNotMatch(autoPlanSource, /throw /)
})

test('settings payloads crossing IPC carry only primitives', () => {
  // draft 是 Vue ref，任何嵌套对象都会变成 reactive Proxy，而 Proxy 无法结构化
  // 克隆。此前 AI 设置回传了嵌套的 workday/lunch，导致 load 之后每次保存都以
  // 「An object could not be cloned」失败，只有首次保存（draft 仍是扁平默认值）能成功。
  const coachConfigSource = main.slice(main.indexOf('function publicAiTaskCoachConfig'), main.indexOf('function saveAiTaskCoachConfig'))
  assert.doesNotMatch(coachConfigSource, /\n\s+workday: normalized\.workday/)
  assert.doesNotMatch(coachConfigSource, /\n\s+lunch: normalized\.lunch/)
  for (const key of ['workdayStart', 'workdayEnd', 'lunchStart', 'lunchEnd', 'bufferMinutes']) {
    assert.match(coachConfigSource, new RegExp(`${key}: normalized\\.`), key)
  }

  // 两个设置卡片都必须逐字段构造 payload，不能直接展开 draft。
  const coachSave = mainRenderer.slice(mainRenderer.indexOf('async function save()', mainRenderer.indexOf('__name: "AICoachSettings"')))
  assert.doesNotMatch(coachSave.slice(0, 1400), /const payload = \{ \.\.\.draft\.value \}/)
  assert.match(coachSave.slice(0, 1400), /workdayStart: String\(draft\.value\.workdayStart/)
})

test('promoting AI steps into sub-todos previews first and never writes without confirmation', () => {
  assert.match(viteConfig, /'ai-step-todos': r\('src\/main\/ai-step-todos\.js'\)/)
  assert.match(verifyBuild, /out\/main\/ai-step-todos\.js/)

  // 三个通道都必须是主窗口专用的 trusted IPC，renderer 不能自己创建待办。
  for (const channel of ['aiCoach:previewStepTodos', 'aiCoach:createStepTodos', 'aiCoach:undoStepBatch']) {
    assert.match(preload, new RegExp(`invoke\\("${channel}"`))
    assert.match(main, new RegExp(`handleTrusted\\("${channel}"`))
  }
  const handlerSource = main.slice(main.indexOf('handleTrusted("aiCoach:previewStepTodos"'), main.indexOf('handleTrusted("aiCoach:toggleStep"'))
  assert.equal((handlerSource.match(/ensureMainWindowSender\(event\)/g) || []).length, 3)
  // 预览不得推送快照：它必须是纯读取，不产生任何数据变更。
  const previewSource = handlerSource.slice(0, handlerSource.indexOf('handleTrusted("aiCoach:createStepTodos"'))
  assert.doesNotMatch(previewSource, /pushSnapshot/)

  // 拆解过期时禁止据此创建子待办。
  assert.match(main, /待办内容在生成拆解后已经变化，请重新生成拆解再创建子待办。/)
  // 撤销冲突必须明说没有删除任何东西。
  assert.match(main, /为避免删除你的内容，本次没有删除任何待办。/)

  // 界面：选择 → 预览 → 确认，三步不可省略。
  assert.match(mainRenderer, /"创建为独立待办"/)
  assert.match(mainRenderer, /点击步骤进行选择；确认前不会创建任何待办。/)
  assert.match(mainRenderer, /"确认创建"/)
  assert.match(mainRenderer, /onClick: previewStepTodos/)
  assert.match(mainRenderer, /onClick: confirmStepTodos/)
  // 只有主进程判定可安全撤销时才给出撤销入口。
  assert.match(mainRenderer, /batch\.undoable \?/)
  // 已提升过的步骤不能重复勾选。
  assert.match(mainRenderer, /picking\.value && promoted/)
})

test('widget expense quick entry can be cancelled without writing a record', () => {
  assert.match(widgetRenderer, /function onLedgerBlankClick\(event\)/)
  assert.match(widgetRenderer, /onClick: onLedgerBlankClick/)
  assert.match(widgetRenderer, /document\.addEventListener\("keydown", onLedgerDocumentKeydown, true\)/)
  const closeSource = widgetRenderer.slice(widgetRenderer.indexOf('function closeLedger()'), widgetRenderer.indexOf('function onLedgerBlankClick'))
  assert.match(closeSource, /ledgerFor\.value = null/)
  assert.match(closeSource, /ledgerAmount\.value = ""/)
  assert.match(closeSource, /ledgerNote\.value = ""/)
})

test('widget focus card flips into a prominent timer and returns directly on cancel', () => {
  const focusCardSource = widgetRenderer.slice(widgetRenderer.indexOf('class: normalizeClass(["wx-focusbar"'), widgetRenderer.indexOf('class: "wx-goals"'))
  assert.match(widgetRenderer, /class: "wx-focus-flipper"/)
  assert.match(widgetRenderer, /class: "wx-focus-face wx-focus-back"/)
  assert.match(focusCardSource, /"专注时间"/)
  assert.match(widgetRenderer, /class: "wx-focus-mark"/)
  assert.match(widgetRenderer, /class: "wx-focus-stopwatch"/)
  assert.match(focusCardSource, /class: "wx-focus-metrics"/)
  assert.doesNotMatch(focusCardSource, /name: "clock"/)
  assert.doesNotMatch(widgetRenderer, /专注办公/)
  assert.match(widgetRenderer, /class: "wx-focus-active-clock"/)
  assert.match(widgetRenderer, /class: "wx-focus-cancel"/)
  assert.match(widgetRenderer, /function cancelFocusFromBar\(\) \{\s*await actions\.cancelFocus\(\)/)
  assert.match(widgetStyles, /\.wx-focusbar\.is-active \.wx-focus-flipper \{\s*transform: rotateX\(180deg\);/)
  assert.match(widgetStyles, /\.wx-focus-stopwatch \{[\s\S]*?border: 1\.5px solid currentColor;[\s\S]*?border-radius: 50%;/)
  assert.match(widgetStyles, /\.wx-focus-stopwatch::before \{[\s\S]*?top: -5px;/)
  assert.match(widgetStyles, /\.wx-focus-stopwatch::after \{[\s\S]*?rotate\(-38deg\);/)
  assert.match(widgetStyles, /\.wx-focus-active-clock \{[\s\S]*?color: #ff4058;[\s\S]*?font-size: clamp\(30px, 8\.6vw, 36px\);/)
  assert.match(widgetStyles, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.wx-focus-flipper,/)
})

test('month calendar summarizes todo density without repeating titles', () => {
  assert.match(mainRenderer, /function cellTodos\(day\)/)
  assert.match(mainRenderer, /项记录 · \$\{open\} 项未完成/)
  assert.match(mainRenderer, /点击后在右侧查看详情/)
  assert.match(mainRenderer, /class: "month-todo-density"/)
  const monthCellSource = mainRenderer.slice(mainRenderer.indexOf('cellTodos(day) ?'), mainRenderer.indexOf('cellExp(day) ?'))
  assert.doesNotMatch(monthCellSource, /t\.title/)
  assert.doesNotMatch(monthCellSource, /taskTimeLabel/)
  assert.match(monthCellSource, /class: "pending"/)
  assert.match(monthCellSource, /"未完成"/)
  assert.match(monthCellSource, /class: "finished"/)
  assert.match(monthCellSource, /"已完成"/)
})

test('automatic rollover keeps an incomplete occurrence on the original calendar date', () => {
  assert.match(main, /require\("\.\/todo-rollovers\.js"\)/)
  assert.match(main, /rolloverHistory: \[\]/)
  assert.match(main, /function migrateTodoRolloverHistories\(\)/)
  const rolloverSource = main.slice(main.indexOf('function rollOverUnfinishedTodos'), main.indexOf('const toNumber'))
  assert.ok(
    rolloverSource.indexOf('recordTodoRollover(todo, today, now)') < rolloverSource.indexOf('todo.date = today'),
    'the missed occurrence must be recorded before the active todo date moves'
  )
  assert.match(mainRenderer, /const rolloversByDate = computed\(\(\) => \{/)
  assert.match(mainRenderer, /function rolloverRecordsOn\(day\)/)
  assert.match(mainRenderer, /record\.status !== "incomplete"/)
  assert.match(mainRenderer, /class: "rollover-record"/)
  assert.match(mainRenderer, /"当日未完成 · 顺延记录"/)
  assert.match(mainRenderer, /rollover: cellTodos\(day\)\.rollover > 0/)
})

test('monthly calendar summary exposes auditable rollover and completion details', () => {
  assert.match(main, /require\("\.\/todo-completions\.js"\)/)
  assert.match(main, /completionHistory: \[\]/)
  assert.match(main, /function migrateTodoCompletionHistories\(\)/)
  const repeatCompletion = main.slice(main.indexOf('if (!todo.done && todo.repeat !== "none"'), main.indexOf('todo.done = !todo.done'))
  assert.ok(
    repeatCompletion.indexOf('recordTodoCompletion(todo, Date.now())') < repeatCompletion.indexOf('todo.date = advanceDate'),
    'a recurring occurrence must be recorded before its active date advances'
  )
  assert.match(mainRenderer, /const completionsByDate = computed\(\(\) => \{/)
  assert.match(mainRenderer, /const monthRollovers = computed\(\(\) => \{/)
  assert.match(mainRenderer, /const monthCompletions = computed\(\(\) => \{/)
  assert.match(mainRenderer, /"本月延期"/)
  assert.match(mainRenderer, /"本月完成"/)
  assert.match(mainRenderer, /"calendar-month-detail-row"/)
  assert.match(mainRenderer, /顺延至 \$\{record\.rolledTo\}/)
  assert.match(mainRenderer, /completionMoment\(record\)/)
  assert.match(mainStyles, /\.calendar-month-summary \{/)
  assert.match(mainStyles, /\.calendar-month-detail-rows \{[\s\S]*?overflow-y: auto;/)
  assert.match(mainStyles, /\.calendar-month-detail-name,[\s\S]*?text-overflow: ellipsis;/)
})

test('calendar and widget keep ledger categories separate and expose unclassified amounts', () => {
  assert.match(mainRenderer, /function calendarExpenseSummary\(entries = \[\]\)/)
  assert.match(mainRenderer, /const key = JSON\.stringify\(\[goalId, categoryId\]\)/)
  assert.match(mainRenderer, /const selectedExp = computed\(\(\) => calendarExpenseSummary\(expensesOn\(state\.selected\)\)\)/)
  assert.match(mainRenderer, /const nonCogs = calendarRound\(s\.opex \+ s\.unclassified\)/)
  assert.match(mainRenderer, /遗留\/未分类/)
  assert.match(bundledRenderer, /unclassified: sum\.unclassified/)
  assert.match(widgetRenderer, /statsOf\(g\)\?\.cur\.unclassified/)
  assert.match(widgetStyles, /\.wx-led-cats \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/)
  assert.match(widgetStyles, /\.wx-led-cat \{[\s\S]*?flex: 0 0 auto;[\s\S]*?padding: 5px 11px 6px;/)
  assert.match(expenseStyles, /\.exp-cats\[data-v-bfbd477c\] \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/)
  assert.doesNotMatch(widgetRenderer, /class: "wx-led-split"/)
  assert.doesNotMatch(widgetStyles, /\.wx-led-cat\.cogs \{[\s\S]*?grid-column:/)
  assert.doesNotMatch(expenseStyles, /\.exp-cat\.cogs\[data-v-bfbd477c\] \{[\s\S]*?grid-column:/)
})

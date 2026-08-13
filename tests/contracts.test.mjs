import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { join } from 'node:path'

const root = process.cwd()
const main = readFileSync(join(root, 'src', 'main', 'index.js'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload', 'index.js'), 'utf8')
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
  assert.equal(requested.length, 45)
  assert.deepEqual(handled, requested)
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
  assert.match(main, /function rendererSettings\(\) \{\s*const \{ remoteReminder: _remoteReminder, \.\.\.visible \} = settings;/)
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

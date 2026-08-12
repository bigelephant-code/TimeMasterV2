import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { join } from 'node:path'

const root = process.cwd()
const main = readFileSync(join(root, 'src', 'main', 'index.js'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload', 'index.js'), 'utf8')
const bundledRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'styles-4HYtOQXD.js'), 'utf8')
const mainRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'index-DQb7weSm.js'), 'utf8')
const widgetRenderer = readFileSync(join(root, 'src', 'renderer', 'assets', 'widget-DirRFNEv.js'), 'utf8')
const widgetStyles = readFileSync(join(root, 'src', 'renderer', 'assets', 'widget-BT2CLSvv.css'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const matches = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1])

test('every preload request channel has a trusted main-process handler', () => {
  const requested = [...new Set(matches(preload, /ipcRenderer\.invoke\("([^"]+)"/g))].sort()
  const handled = [...new Set(matches(main, /handleTrusted\("([^"]+)"/g))].sort()
  assert.equal(requested.length, 41)
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

  const sanitizerSource = main.match(/function sanitizeXmlText\(value\) \{[\s\S]*?\n\}/)?.[0]
  const escapeSource = main.match(/const escapeXml = \(value\) => .*?;\n/)?.[0]
  assert.ok(sanitizerSource && escapeSource, 'Could not load the production XML sanitizer')
  const productionEscapeXml = Function(`${sanitizerSource}\n${escapeSource}\nreturn escapeXml`)()
  assert.equal(
    productionEscapeXml(`safe\u0000\t\n\r&<>"'\ud800😀`),
    `safe\t\n\r&amp;&lt;&gt;&quot;&apos;😀`
  )

  const keySource = main.match(/function workbookCategoryKey\(value\) \{[\s\S]*?\n\}/)?.[0]
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

test('calendar and widget keep ledger categories separate and expose unclassified amounts', () => {
  assert.match(mainRenderer, /function calendarExpenseSummary\(entries = \[\]\)/)
  assert.match(mainRenderer, /const key = JSON\.stringify\(\[goalId, categoryId\]\)/)
  assert.match(mainRenderer, /const selectedExp = computed\(\(\) => calendarExpenseSummary\(expensesOn\(state\.selected\)\)\)/)
  assert.match(mainRenderer, /const nonCogs = calendarRound\(s\.opex \+ s\.unclassified\)/)
  assert.match(mainRenderer, /遗留\/未分类/)
  assert.match(bundledRenderer, /unclassified: sum\.unclassified/)
  assert.match(widgetRenderer, /statsOf\(g\)\?\.cur\.unclassified/)
  assert.match(widgetStyles, /grid-template-columns: repeat\(auto-fill, minmax\(42px, 1fr\)\)/)
  assert.match(widgetStyles, /\.wx-led-split \{\s*grid-column: 1 \/ -1;/)
  assert.match(widgetStyles, /\.wx-led-cat\.cogs \{\s*grid-column: 1 \/ -1;/)
})

# Current source-equivalent reconstruction

This directory is the editable build input for TimeMaster 0.1.9 development
line. `npm run build` uses `electron-vite` to compile it into `out/`, and release
packaging consumes only `out/`.

The files were reconstructed from the project's owner-produced 0.1.3 installer
because the original development directory was never committed and is no longer
available. The installer did not contain source maps, so this is not claimed to
be the lost original source tree:

- `main/index.js` and `preload/index.js` retain readable names, comments, and
  behavior, but their former module boundaries were removed by the original
  build.
- `renderer/` retains compiled Vue render functions and CSS. It is editable and
  buildable, but the original `.vue` template formatting and unused code cannot
  be recovered byte for byte.
- Vue and `lunar-javascript` are declared at their identified exact versions for
  dependency auditing and license provenance; the reference renderer snapshot
  already contains their bundled runtime code. Those declarations must not be
  updated independently of the embedded code.

The immutable comparison copy remains in `runtime/` and is protected by
`docs/runtime-0.1.3.sha256`. The next maintenance milestone is to split this
equivalent source into normal Electron modules, Vue SFCs, and composables while
using the reference snapshot, contract tests, and sanitized UI fixtures to guard
behavior and data compatibility.

// dist/index.html에서 골격(doctype·html·head·body)을 빼고 내용만 남긴 artifact/artifact.html을 만든다.
// assets는 그대로 복사해 같은 상대 경로로 함께 올린다. 아티팩트는 이 파일을 골격으로 다시 감싼다.
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const out = path.resolve('artifact')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'assets'), { recursive: true })

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
const keep = head
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !/<meta charset|<meta name="viewport"/.test(l))

// body 바탕은 아티팩트 골격용. 앱 CSS는 .gle 아래에만 있어서 여기서 따로 칠한다.
const bodyBg = `<style>body{background:#e9e9e6}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) body{background:#141513}}:root[data-theme="dark"] body{background:#141513}</style>`
const page = [
  ...keep.filter((l) => l.startsWith('<title')),
  '<meta name="claude:viewport-fit-sides" content="cover">',
  bodyBg,
  ...keep.filter((l) => !l.startsWith('<title')),
  body.trim(),
].join('\n')
fs.writeFileSync(path.join(out, 'artifact.html'), page + '\n')

const files = fs.readdirSync(path.join(dist, 'assets'))
files.forEach((f) => fs.copyFileSync(path.join(dist, 'assets', f), path.join(out, 'assets', f)))
console.log(page)
console.log('\nassets:', files.join(', '))

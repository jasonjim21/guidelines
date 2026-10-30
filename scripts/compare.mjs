// 재현 결과를 원본 렌더와 쪽마다 비교한다.
// 원본 렌더: python3 -I -c "import pymupdf as f,sys;d=f.open(sys.argv[1]);[p.get_pixmap().save(f'{sys.argv[2]}/o-{i+1:02d}.png') for i,p in enumerate(d)]" 원본.ai 폴더
// 사용: node scripts/compare.mjs <원본폴더> [출력폴더]   (dist가 빌드되어 있어야 함)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const orig = path.resolve(process.argv[2])
const out = path.resolve(process.argv[3] ?? 'shots/compare')
fs.mkdirSync(out, { recursive: true })
const root = path.resolve('dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }
const server = http.createServer((q, r) => {
  const p = path.join(root, q.url.split('?')[0].replace(/\/$/, '/index.html'))
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' })
  fs.createReadStream(p).pipe(r)
}).listen(0)

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined
const browser = await chromium.launch({ proxy })
const page = await browser.newPage({ viewport: { width: 1920, height: 1100 }, ignoreHTTPSErrors: true })
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`)
await page.addStyleTag({ content: 'html{overflow:hidden}.gle .gle-pages{max-width:none!important}.gle{padding:0!important}.gle .gle-page svg{box-shadow:none!important;width:1920px!important}' })
await page.waitForTimeout(3000)
const svgs = await page.locator('.gle-page svg').all()
const rows = []
for (let i = 0; i < svgs.length; i++) {
  const n = String(i + 1).padStart(2, '0')
  const mine = path.join(out, `r-${n}.png`)
  await svgs[i].screenshot({ path: mine })
  const o = path.join(orig, `o-${n}.png`)
  let ae = ''
  try {
    execFileSync('compare', ['-metric', 'AE', '-fuzz', '12%', mine, o, path.join(out, `d-${n}.png`)], { stdio: 'pipe' })
    ae = '0'
  } catch (e) { ae = String(e.stderr).trim() }
  const px = Number(ae.split(' ')[0])
  rows.push(`${n}  다른 픽셀 ${(px / (1920 * 1080) * 100).toFixed(2)}%`)
}
await browser.close()
server.close()
console.log(rows.join('\n'))

// 빌드 결과를 헤드리스 브라우저로 띄워 스크린샷을 남긴다. 타입체크로는 조판이 맞는지 모른다.
// 사용: node scripts/shot.mjs [dist|artifact] [출력폴더]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = path.resolve(process.argv[2] ?? 'dist')
const out = path.resolve(process.argv[3] ?? 'shots')
fs.mkdirSync(out, { recursive: true })

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' })
  fs.createReadStream(p).pipe(res)
}).listen(0)
const port = server.address().port

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined
const browser = await chromium.launch({ proxy })
const errors = []
async function shot(name, { width, height, scheme = 'light', act } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, ignoreHTTPSErrors: true })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  await page.goto(`http://127.0.0.1:${port}/index.html`)
  await page.waitForTimeout(2500)
  if (act) await act(page)
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 0) errors.push(`${name}: 가로 넘침 ${overflow}px`)
  await page.close()
}

await shot('desktop', { width: 1600, height: 1000 })
await shot('desktop-dark', { width: 1600, height: 1000, scheme: 'dark' })
await shot('phone', { width: 400, height: 900 })

await browser.close()
server.close()
console.log(errors.length ? errors.join('\n') : 'no console errors')

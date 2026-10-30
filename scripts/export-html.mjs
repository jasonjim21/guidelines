// 장표를 HTML 한 파일로 뽑는다 — 서체·그림까지 다 품어서 인터넷 없이 열린다.
// 사용: npm run build && node scripts/export-html.mjs [deck|original] [출력 경로]
//   deck     — 전체 장표 (원본 17장 + 목차 응용 시스템 5항목 + 응용 시스템 내지 5장), 기본값
//   original — 원본 재현 17장만
// 그림(로고 패스·사진)이 들어가므로 출력은 저장소에 넣지 않는다 (export/ 는 gitignore).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const route = process.argv[2] === 'original' ? 'original' : 'deck'
const out = path.resolve(process.argv[3] ?? (route === 'deck' ? 'export/samwoo-ci-v1-full.html' : 'export/samwoo-ci-v1.html'))
const TITLE = route === 'deck' ? '삼우건기 CI 가이드라인 v1 — 전체 장표' : '삼우건기 CI 가이드라인 v1 — 원본 재현'
fs.mkdirSync(path.dirname(out), { recursive: true })

/* 서체: Pretendard는 번들 파일, Inter·Barlow Condensed는 Google Fonts의 라틴 구간만 받아 품는다 */
const b64 = (buf) => buf.toString('base64')
const pretendard = fs.readFileSync(require.resolve('pretendard/dist/web/variable/woff2/PretendardVariable.woff2'))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const css = execFileSync('curl', ['-sS', '-A', UA, 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Barlow+Condensed:wght@600&display=swap']).toString()
const faces = []
const seen = new Map()
for (const m of css.matchAll(/\/\* latin \*\/\s*@font-face\s*{([^}]*)}/g)) {
  const body = m[1]
  const family = body.match(/font-family:\s*'([^']+)'/)[1]
  const weight = body.match(/font-weight:\s*(\d+)/)[1]
  const url = body.match(/url\(([^)]+)\)/)[1]
  if (!seen.has(url)) seen.set(url, b64(execFileSync('curl', ['-sS', url])))
  const range = body.match(/unicode-range:\s*([^;]+);/)[1]
  faces.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${seen.get(url)}) format('woff2');unicode-range:${range}}`)
}
faces.push(`@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;src:url(data:font/woff2;base64,${b64(pretendard)}) format('woff2-variations')}`)

/* 빌드된 화면을 띄워 #original의 SVG를 그대로 꺼낸다 — 렌더러는 하나뿐이다 */
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
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true })
await page.goto(`http://127.0.0.1:${server.address().port}/index.html#${route}`)
await page.waitForTimeout(3000)
const svgs = await page.locator('.gle-original svg').evaluateAll((els) => els.map((e) => e.outerHTML))
await browser.close()
server.close()

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE} ${svgs.length}장</title>
<style>
${faces.join('\n')}
html,body{margin:0;background:#e9e9e6}
main{display:flex;flex-direction:column;gap:24px;max-width:1920px;margin:0 auto;padding:24px 16px}
svg{display:block;width:100%;height:auto;box-shadow:0 1px 3px rgba(0,0,0,.15)}
@page{size:1920px 1080px;margin:0}
@media print{html,body{background:#fff}main{padding:0;gap:0;max-width:none}svg{box-shadow:none;width:1920px;height:1080px;break-after:page}}
</style>
</head>
<body>
<main>
${svgs.join('\n')}
</main>
</body>
</html>
`
fs.writeFileSync(out, html)
console.log(`${svgs.length}장 → ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)}MB)`)

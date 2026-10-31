// 넘길 파일 묶기 — 저장소에 들어간 파일 + 로고 패스·사진(references/local) + 고른 조합의 HTML 장표
// 사용: npm run build && node scripts/handoff.mjs   → export/guideline-engine.zip
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const out = path.resolve('export/guideline-engine.zip')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.rmSync(out, { force: true })
const files = execFileSync('git', ['ls-files']).toString().trim().split('\n')
const local = fs.existsSync('references/local') ? fs.readdirSync('references/local').map((f) => `references/local/${f}`) : []
const decks = fs.existsSync('export') ? fs.readdirSync('export').filter((f) => f.endsWith('.html')).map((f) => `export/${f}`) : []
execFileSync('zip', ['-q', '-X', out, ...files, ...local, ...decks])
console.log(`${files.length + local.length + decks.length}개 → ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)}MB)`)
if (!local.length) console.log('※ references/local 이 없어 로고·사진은 빠졌습니다 (상자로 그려짐)')

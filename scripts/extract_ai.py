"""
Illustrator(.ai, PDF 호환) → 좌표 원자료 JSON.

    python3 -I scripts/extract_ai.py <파일.ai> references/samwoo-ci-v1.json

모든 요소를 칠하는 순서대로 뽑는다: 글(줄 단위 span), 사각형, 선/패스, 그림.
그룹 투명도와 잘라내기(clip)를 요소마다 풀어서 붙인다.

저장소 규칙: 그림 자체(패스 모양·사진 픽셀)는 저장소에 넣지 않는다.
  - <출력>.json            : 좌표·크기·색·투명도·글자 (커밋)
  - references/local/<이름>.assets.json : 패스 d 값과 사진 data URL (gitignore, 미리보기용)
"""
import base64
import json
import os
import sys

import pymupdf as fitz


def hexc(c):
    if c is None:
        return None
    if isinstance(c, int):
        return '#%06x' % c
    return '#%02x%02x%02x' % tuple(round(max(0, min(1, v)) * 255) for v in c[:3])


R = lambda v: round(v, 2)


def path_d(items):
    d = []
    cur = None
    for it in items:
        op = it[0]
        if op == 'l':
            p1, p2 = it[1], it[2]
            if cur is None or abs(cur.x - p1.x) > 0.01 or abs(cur.y - p1.y) > 0.01:
                d.append(f'M{R(p1.x)} {R(p1.y)}')
            d.append(f'L{R(p2.x)} {R(p2.y)}')
            cur = p2
        elif op == 'c':
            p1, c1, c2, p2 = it[1], it[2], it[3], it[4]
            if cur is None or abs(cur.x - p1.x) > 0.01 or abs(cur.y - p1.y) > 0.01:
                d.append(f'M{R(p1.x)} {R(p1.y)}')
            d.append(f'C{R(c1.x)} {R(c1.y)} {R(c2.x)} {R(c2.y)} {R(p2.x)} {R(p2.y)}')
            cur = p2
        elif op == 're':
            r = it[1]
            d.append(f'M{R(r.x0)} {R(r.y0)}H{R(r.x1)}V{R(r.y1)}H{R(r.x0)}Z')
            cur = None
        elif op == 'qu':
            q = it[1]
            d.append(f'M{R(q.ul.x)} {R(q.ul.y)}L{R(q.ur.x)} {R(q.ur.y)}L{R(q.lr.x)} {R(q.lr.y)}L{R(q.ll.x)} {R(q.ll.y)}Z')
            cur = None
    return ''.join(d)


def main(src, out):
    doc = fitz.open(src)
    name = os.path.splitext(os.path.basename(out))[0]
    local_dir = os.path.join(os.path.dirname(out), 'local')
    os.makedirs(local_dir, exist_ok=True)
    assets = {}
    pages = []
    fonts = set()

    for pno, page in enumerate(doc):
        W, H = page.rect.width, page.rect.height
        seq = []
        drs = page.get_drawings(extended=True)
        # 그룹·클립 항목에는 seqno가 없다 — 바로 앞 그리기 항목 직후로 놓는다
        prev = -1
        keys = [0.0] * len(drs)
        for i, dr in enumerate(drs):
            if 'seqno' in dr:
                prev = dr['seqno']
                keys[i] = float(prev)
            else:
                keys[i] = prev + 0.5 + i * 1e-6
        for k, dr in zip(keys, drs):
            seq.append((k, 'd', dr))
        for sp in page.get_texttrace():
            seq.append((sp['seqno'], 't', sp))
        imgs = [b for b in page.get_text('dict')['blocks'] if b['type'] == 1]
        seq.sort(key=lambda x: x[0])

        # 글자의 그룹 투명도: 그룹 시작에는 순서 번호가 없어 시점으로는 못 맞춘다.
        # 대신 글 상자와 거의 같은 상자를 가진 그룹(일러스트레이터가 글 하나에 투명도를 줄 때 생기는 모양)을 찾는다.
        text_groups = []
        for i, dr in enumerate(drs):
            if dr['type'] == 'group' and (dr.get('opacity') or 1) < 0.999:
                clip = None
                if i + 1 < len(drs) and drs[i + 1]['type'] == 'clip':
                    clip = fitz.Rect(drs[i + 1]['scissor'])
                text_groups.append((fitz.Rect(dr['rect']), dr['opacity'], clip))

        page_area = page.rect.get_area()

        def text_group(bb):
            b = fitz.Rect(bb)
            # 1) 글 상자를 감싸는 가장 작은 그룹 (여러 줄 글 묶음에 투명도를 준 경우)
            inside = [(r.get_area(), o, c) for r, o, c in text_groups
                      if r.x0 - 2 <= b.x0 and r.y0 - 2 <= b.y0 and r.x1 + 2 >= b.x1 and r.y1 + 2 >= b.y1 and r.get_area() < page_area * 0.2]
            if inside:
                inside.sort(key=lambda x: x[0])
                return (1.0, inside[0][1], inside[0][2])
            # 2) 상자가 거의 같은 그룹 (큰 글자는 글 상자가 그룹보다 살짝 크다)
            best = None
            for r, o, c in text_groups:
                inter = (r & b).get_area()
                union = r.get_area() + b.get_area() - inter
                iou = inter / union if union else 0
                if iou > 0.6 and (best is None or iou > best[0]):
                    best = (iou, o, c)
            return best

        # 그룹·클립 범위: 같은 level 이하의 항목이 나오면 닫힌다
        stack = []  # (level, kind, opacity, rect, clip path key)
        clip_marks = []  # (scissor, path key, 그 시점의 els 길이) — 사진 자리 찾기용
        els = []
        n = 0

        def close_to(level):
            while stack and stack[-1][0] >= level:
                stack.pop()

        def state(bbox):
            # 글자에는 level이 없다 — 열려 있는 그룹 중 글 상자를 감싸는 것만 적용
            op = 1.0
            clip = None
            state.key = None
            for lv, kind, o, r, key in stack:
                if bbox is not None:
                    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
                    if not (r.x0 - 1 <= cx <= r.x1 + 1 and r.y0 - 1 <= cy <= r.y1 + 1):
                        continue
                if kind == 'group':
                    op *= o
                elif kind == 'clip':
                    clip = r if clip is None else fitz.Rect(r) & clip
                    if key:
                        state.key = key
            return op, clip

        for _, kind, it in seq:
            if kind == 'd':
                lv = it.get('level', 0)
                close_to(lv)
                if it['type'] == 'group':
                    stack.append((lv, 'group', it.get('opacity') or 1.0, fitz.Rect(it['rect']), None))
                    continue
                if it['type'] == 'clip':
                    items = it.get('items') or []
                    key = None
                    if items and not (len(items) == 1 and items[0][0] == 're'):
                        key = f'clip:p{pno + 1}-{len(clip_marks)}'
                        assets[key] = path_d(items)
                    clip_marks.append((fitz.Rect(it['scissor']), key, len(els)))
                    stack.append((lv, 'clip', 1.0, fitz.Rect(it['scissor']), key))
                    continue
                if it['type'] == 'restore':
                    continue
                op, clip = state(None)
                r = it['rect']
                n += 1
                eid = f'p{pno + 1}-{n}'
                fill = hexc(it.get('fill'))
                stroke = hexc(it.get('color')) if 's' in it['type'] else None
                el = {'id': eid, 'box': [R(r.x0), R(r.y0), R(r.width), R(r.height)]}
                if fill and 'f' in it['type']:
                    el['fill'] = fill
                    fo = it.get('fill_opacity')
                    if fo is not None and fo < 0.999:
                        op_f = fo
                        el['fillOpacity'] = R(op_f)
                if stroke:
                    el['stroke'] = stroke
                    el['sw'] = R(it.get('width') or 1)
                    if it.get('dashes') and it['dashes'] not in ('[] 0', '[] 0.0'):
                        el['dash'] = it['dashes']
                if op < 0.999:
                    el['opacity'] = R(op)
                if clip is not None and not (clip.x0 <= 0.5 and clip.y0 <= 0.5 and clip.x1 >= W - 0.5 and clip.y1 >= H - 0.5):
                    el['clip'] = [R(clip.x0), R(clip.y0), R(clip.width), R(clip.height)]
                if state.key:
                    el['clipPath'] = state.key
                items = it['items']
                simple_rect = len(items) == 1 and items[0][0] == 're'
                if simple_rect and 'f' in it['type'] and 's' not in it['type']:
                    el['t'] = 'rect'
                elif len(items) == 1 and items[0][0] == 'l' and stroke and not fill:
                    p1, p2 = items[0][1], items[0][2]
                    el['t'] = 'line'
                    el['pts'] = [R(p1.x), R(p1.y), R(p2.x), R(p2.y)]
                else:
                    el['t'] = 'path'
                    # 사각형 여러 개가 한 패스면(ㅁ 받침처럼 바깥·안쪽) 방향 정보가 같게 나와 안쪽이 채워진다 → 짝홀 규칙으로 구멍을 낸다
                    if it.get('even_odd') or sum(1 for x in items if x[0] == 're') >= 2:
                        el['evenodd'] = True
                    d = path_d(items)
                    if it.get('closePath') and not d.endswith('Z'):
                        d += 'Z'
                    assets[eid] = d
                els.append(el)
            else:
                sp = it
                chars = sp['chars']
                if not chars:
                    continue
                bb = sp['bbox']
                op, clip = 1.0, None
                g = text_group(bb)
                if g:
                    op, clip = g[1], g[2]
                op *= sp.get('opacity', 1.0) or 1.0
                fonts.add(sp['font'])
                # 한 span이 여러 줄일 수 있다 — 베이스라인이 바뀌면 줄을 나눈다
                lines = []
                # 같은 줄이라도 글자 사이가 크게 벌어지면(표 머리처럼 칸마다 놓은 글) 따로 나눈다
                for c in chars:
                    if not lines or abs(c[2][1] - lines[-1][0][2][1]) > 0.5:
                        lines.append([c])
                    elif c[2][0] - lines[-1][-1][3][2] > sp['size'] * 0.9:
                        lines.append([c])
                    else:
                        lines[-1].append(c)
                for ln in lines:
                    text = ''.join(chr(c[0]) for c in ln)
                    if not text.strip():
                        continue
                    x0 = ln[0][2][0]
                    xe = max(c[3][2] for c in ln)
                    n += 1
                    el = {
                        't': 'text', 'id': f'p{pno + 1}-{n}', 's': text.rstrip(),
                        'x': R(x0), 'y': R(ln[0][2][1]), 'w': R(xe - x0), 'size': R(sp['size']),
                        'font': sp['font'], 'fill': hexc(sp['color']),
                    }
                    if op < 0.999:
                        el['opacity'] = R(op)
                    if clip is not None and not (clip.x0 <= 0.5 and clip.y0 <= 0.5 and clip.x1 >= W - 0.5 and clip.y1 >= H - 0.5):
                        el['clip'] = [R(clip.x0), R(clip.y0), R(clip.width), R(clip.height)]
                    els.append(el)

        # 사진 — 칠하는 순서 정보가 없다. 겹치는 첫 패스·글 바로 앞에 끼우고, 바로 앞 사각형(타일) 안으로 자른다
        for im in imgs:
            b = fitz.Rect(im['bbox'])
            n += 1
            eid = f'p{pno + 1}-{n}'
            el = {'t': 'image', 'id': eid, 'box': [R(b.x0), R(b.y0), R(b.width), R(b.height)]}
            at = None
            for r, key, pos in clip_marks:
                inter = (r & b).get_area()
                if b.get_area() and inter / b.get_area() > 0.98 and r.get_area() <= b.get_area() * 1.02 and key:
                    at = pos
                    el['clipPath'] = key
                    break
            if at is not None:
                els.insert(at, el)
                el['_placed'] = True
            at = len(els) if at is None else at
            for i, e in enumerate(els if not el.get('_placed') else []):
                if e['t'] in ('path', 'text') and 'box' in e:
                    eb = fitz.Rect(e['box'][0], e['box'][1], e['box'][0] + e['box'][2], e['box'][1] + e['box'][3])
                    if eb.intersects(b):
                        at = i
                        break
            for e in (reversed(els[:at]) if not el.get('_placed') else []):
                if e['t'] == 'rect':
                    eb = fitz.Rect(e['box'][0], e['box'][1], e['box'][0] + e['box'][2], e['box'][1] + e['box'][3])
                    if eb.intersects(b) and eb.get_area() < page.rect.get_area() * 0.5:
                        c = eb & b
                        el['clip'] = [R(c.x0), R(c.y0), R(c.width), R(c.height)]
                        break
            if not el.pop('_placed', False):
                els.insert(at, el)
            try:
                pix = fitz.Pixmap(im['image'])
                if pix.alpha:
                    pix = fitz.Pixmap(pix, 0)
                if pix.colorspace and pix.colorspace.n != 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                if pix.width > 900:
                    pix = fitz.Pixmap(pix, 900, int(pix.height * 900 / pix.width), None)
                assets[eid] = 'data:image/jpeg;base64,' + base64.b64encode(pix.tobytes('jpeg', jpg_quality=82)).decode()
            except Exception as e:  # noqa
                print('image skip', eid, e, file=sys.stderr)

        pages.append({'page': pno + 1, 'w': W, 'h': H, 'els': els})

    data = {
        'source': os.path.basename(src).split('-', 1)[-1],
        'unit': 'pt (1920×1080 대지 = px)',
        'fonts': sorted(fonts),
        'pages': pages,
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(local_dir, name + '.assets.json'), 'w', encoding='utf-8') as f:
        json.dump(assets, f, separators=(',', ':'))
    total = sum(len(p['els']) for p in pages)
    print(f'{len(pages)} pages, {total} elements, {len(assets)} assets, fonts: {", ".join(sorted(fonts))}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

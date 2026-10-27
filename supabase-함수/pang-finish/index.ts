// @ts-nocheck
// 자동으로 만든 파일이에요 — 고칠 땐 site/assets/js/pang-engine.js 와 supabase/functions/pang-finish/handler.ts.txt 를 고치고 이 스크립트를 다시 돌려요
/* ================================================================
   모아팡 규칙 (화면 없이 규칙만)
   · 브라우저 게임(pang.html)과 서버 점수 확인(supabase/functions/pang-finish)이 이 파일을 똑같이 써요
     → 같은 시드 · 같은 움직임이면 언제나 같은 점수가 나와요
   · 판 배치와 새로 떨어지는 캐릭터는 모두 시드로 정해져요 (Math.random 을 쓰지 않아요)
   ⚠ 이 파일을 고치면 supabase/functions/pang-finish/engine.js 에도 똑같이 복사해 주세요
   ================================================================ */
(function (root) {
  const N = 8, KINDS = 7, PT = 20, EXT_MAX = 30, FEVER_MS = 5000, MIN_GAP = 250, MAX_MOVES = 400;   // MIN_GAP: 움직임 사이 최소 간격(ms) · 사람 손으로는 이보다 빠를 수 없어요

  // 시드 난수 (mulberry32)
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* cfg = { seed, secs, glass } → 판 상태 */
  function create(cfg) {
    const R = rng(cfg.seed), s = { cfg, R, grid: [], uid: 0, score: 0, fever: 0, feverUntil: -1, ext: 0, moves: 0 };
    const rk = () => Math.floor(R() * KINDS);
    for (let r = 0; r < N; r++) { s.grid[r] = []; for (let c = 0; c < N; c++) {
      let k; do { k = rk(); } while ((c > 1 && s.grid[r][c - 1].k === k && s.grid[r][c - 2].k === k) || (r > 1 && s.grid[r - 1][c].k === k && s.grid[r - 2][c].k === k));
      s.grid[r][c] = { id: ++s.uid, k, sp: null, r, c };
    } }
    return s;
  }
  const endMs = s => (s.cfg.secs + s.ext) * 1000;
  const feverOn = (s, t) => t < s.feverUntil;
  const same = (a, b) => a && b && a.k >= 0 && a.k === b.k;
  function runs(s) {   // 가로 · 세로로 3개 이상 이어진 줄
    const g = s.grid, out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N;) { let e = c + 1; while (e < N && same(g[r][c], g[r][e])) e++; if (e - c >= 3) out.push(Array.from({ length: e - c }, (_, i) => [r, c + i])); c = e; }
    for (let c = 0; c < N; c++) for (let r = 0; r < N;) { let e = r + 1; while (e < N && same(g[r][c], g[e][c])) e++; if (e - r >= 3) out.push(Array.from({ length: e - r }, (_, i) => [r + i, c])); r = e; }
    return out;
  }
  function mostKind(s) {
    const n = {}; let best = 0, bk = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = s.grid[r][c]; if (t && t.k >= 0) n[t.k] = (n[t.k] || 0) + 1; }
    for (let k = 0; k < KINDS; k++) if ((n[k] || 0) > best) { best = n[k]; bk = k; }
    return bk;
  }
  function hasMove(s) {
    const g = s.grid;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c].sp) return true;   // 특수 캐릭터는 눌러서 터뜨릴 수 있어요
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue;
      const a = g[r][c], b = g[r2][c2]; g[r][c] = b; g[r2][c2] = a;
      const ok = runs(s).length > 0; g[r][c] = a; g[r2][c2] = b; if (ok) return true;
    }
    return false;
  }
  const rndSp = s => s.cfg.glass && s.R() < 1 / 38 ? 'glass' : s.R() < 1 / 90 ? 'charm' : null;
  function addFever(s, t, n, steps) {
    if (feverOn(s, t)) return;
    s.fever = Math.min(100, s.fever + n);
    if (s.fever >= 100) { s.fever = 0; s.feverUntil = t + FEVER_MS; steps.push({ type: 'fever', until: s.feverUntil }); }
  }
  // 터뜨리기: 특수 캐릭터는 옆으로 번져요 (부적 → 가로줄 · 모래시계 → 시간 · 별 구슬 → 같은 캐릭터 전부)
  function blast(s, cells, combo, make, t, steps, orbKind) {
    const g = s.grid, list = [...cells.values()], seen = new Set(cells.keys()), fx = []; let bonus = 0, ext = 0;
    const add = (r, c) => { const key = r * N + c; if (!seen.has(key) && g[r][c]) { seen.add(key); cells.set(key, [r, c]); list.push([r, c]); } };
    for (let i = 0; i < list.length; i++) {
      const [r, c] = list[i], tl = g[r][c]; if (!tl || tl.fired) continue;
      if (tl.sp === 'charm') { tl.fired = 1; for (let cc = 0; cc < N; cc++) add(r, cc); bonus += PT * 4; fx.push({ r, c, txt: '부적 팡!', cls: 'big', item: 1 }); }
      else if (tl.sp === 'glass') { tl.fired = 1; const plus = Math.min(5, EXT_MAX - s.ext); if (plus > 0) { s.ext += plus; ext += plus; } bonus += 200; fx.push({ r, c, txt: plus > 0 ? `+${plus}초!` : '+200', cls: 'big', item: 1 }); }
      else if (tl.sp === 'orb') { tl.fired = 1; const k = orbKind != null && orbKind >= 0 ? orbKind : mostKind(s); for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (g[rr][cc] && g[rr][cc].k === k) add(rr, cc); bonus += PT * 6; fx.push({ r, c, txt: '별 구슬 팡!!', cls: 'huge', item: 1 }); }
    }
    const gain = Math.round((cells.size * PT * (1 + (combo - 1) * .5) + bonus) * (feverOn(s, t) ? 2 : 1));
    s.score += gain;
    const ids = []; cells.forEach(([r, c]) => { if (g[r][c]) ids.push(g[r][c].id); });
    steps.push({ type: 'blast', ids, gain, combo, fx, ext, mid: list[Math.floor(list.length / 2)] || [3, 3] });
    addFever(s, t, 5 + combo * 4, steps);
    cells.forEach(([r, c]) => { g[r][c] = null; });
    const made = [];
    make.forEach(m => { const tl = g[m.r][m.c]; if (!tl) return; tl.sp = m.sp; if (m.sp === 'orb') tl.k = -1; made.push({ id: tl.id, sp: tl.sp, k: tl.k, r: m.r, c: m.c }); });
    if (made.length) steps.push({ type: 'make', made });
    // 아래로 떨어뜨리고 위에서 새 캐릭터
    const moves = [], spawns = [];
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) if (g[r][c]) { const tl = g[r][c]; g[r][c] = null; g[w][c] = tl; if (tl.r !== w) moves.push({ id: tl.id, r: w, c }); tl.r = w; w--; }
      for (let r = w, k = 0; r >= 0; r--, k++) { const kind = Math.floor(s.R() * KINDS), sp = rndSp(s), tl = { id: ++s.uid, k: kind, sp, r, c }; g[r][c] = tl; spawns.push({ id: tl.id, k: kind, sp, r, c, from: -1 - k }); }
    }
    steps.push({ type: 'drop', moves, spawns });
  }
  function resolve(s, moved, t, steps) {
    let combo = 0, rs;
    while ((rs = runs(s)).length) {
      combo++;
      const cells = new Map(), make = [];
      rs.forEach(run => {
        run.forEach(([r, c]) => cells.set(r * N + c, [r, c]));
        if (run.length >= 4) {
          const pick = run.find(([r, c]) => moved.some(m => m[0] === r && m[1] === c)) || run[Math.floor(run.length / 2)], tl = s.grid[pick[0]][pick[1]];
          if (!tl.sp && !make.some(m => m.r === pick[0] && m.c === pick[1])) make.push({ r: pick[0], c: pick[1], sp: run.length >= 5 ? 'orb' : 'charm' });
        }
      });
      make.forEach(m => cells.delete(m.r * N + m.c));
      blast(s, cells, combo, make, t, steps); moved = [];
    }
    if (!hasMove(s)) {   // 둘 곳이 없으면 섞어요 (이것도 시드로)
      const all = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) all.push(s.grid[r][c]);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(s.R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      all.forEach((tl, i) => { tl.r = Math.floor(i / N); tl.c = i % N; s.grid[tl.r][tl.c] = tl; });
      steps.push({ type: 'shuffle', pos: all.map(tl => ({ id: tl.id, r: tl.r, c: tl.c })) });
      resolve(s, [], t, steps);
    }
  }
  const inB = (r, c) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < N && c >= 0 && c < N;
  /* 두 칸 바꾸기 (t: 판 시작부터 지난 ms) → { ok, steps } · 맞는 줄이 없으면 ok:false (되돌려요) */
  function swap(s, r1, c1, r2, c2, t) {
    const steps = [];
    if (!inB(r1, c1) || !inB(r2, c2) || Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1 || t > endMs(s)) return { ok: false, steps };
    const g = s.grid, a = g[r1][c1], b = g[r2][c2];
    g[r1][c1] = b; g[r2][c2] = a; a.r = r2; a.c = c2; b.r = r1; b.c = c1;
    const orb = a.sp === 'orb' ? a : b.sp === 'orb' ? b : null;
    if (orb) {   // 별 구슬을 옆 캐릭터와 바꾸면 그 캐릭터가 전부 터져요
      const other = orb === a ? b : a, kind = other.sp === 'orb' ? mostKind(s) : other.k;
      s.moves++; blast(s, new Map([[orb.r * N + orb.c, [orb.r, orb.c]]]), 1, [], t, steps, kind); resolve(s, [], t, steps);
      return { ok: true, steps };
    }
    if (!runs(s).length) { g[r1][c1] = a; g[r2][c2] = b; a.r = r1; a.c = c1; b.r = r2; b.c = c2; return { ok: false, steps }; }
    s.moves++; resolve(s, [[r1, c1], [r2, c2]], t, steps);
    return { ok: true, steps };
  }
  /* 특수 캐릭터 누르기 → { ok, steps } */
  function tap(s, r, c, t) {
    const steps = [];
    if (!inB(r, c) || t > endMs(s) || !s.grid[r][c] || !s.grid[r][c].sp) return { ok: false, steps };
    s.moves++; blast(s, new Map([[r * N + c, [r, c]]]), 1, [], t, steps); resolve(s, [], t, steps);
    return { ok: true, steps };
  }
  /* 판 시작 직후 (처음 판에서 터질 게 있으면 정리) */
  function start(s) { const steps = []; resolve(s, [], 0, steps); return steps; }
  /* 서버 확인용: 기록된 움직임을 처음부터 다시 돌려 점수를 계산해요
     moves: [[t, r1, c1, r2, c2], ...] (바꾸기) 또는 [[t, r, c], ...] (특수 캐릭터 누르기)
     → { score, ok, reason } · 시간이 거꾸로 가거나 · 너무 빠르거나 · 시간이 지난 움직임은 무효 */
  function replay(cfg, moves) {
    const s = create(cfg); start(s);
    if (!Array.isArray(moves) || moves.length > MAX_MOVES) return { score: 0, ok: false, reason: 'too many moves' };
    let last = -Infinity;
    for (const m of moves) {
      if (!Array.isArray(m) || (m.length !== 3 && m.length !== 5) || !m.every(Number.isFinite)) return { score: 0, ok: false, reason: 'bad move' };
      const t = m[0];
      if (t < 0 || t < last || (t - last) < MIN_GAP) return { score: 0, ok: false, reason: 'timing' };
      if (t > endMs(s)) break;   // 시간이 지난 뒤 움직임은 버려요
      last = t;
      if (m.length === 5) swap(s, m[1], m[2], m[3], m[4], t); else tap(s, m[1], m[2], t);
    }
    return { score: s.score, ok: true, last, end: endMs(s), moves: s.moves };
  }
  const API = { N, KINDS, PT, EXT_MAX, FEVER_MS, MIN_GAP, create, start, swap, tap, replay, endMs, feverOn };
  root.PangEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);


// ================================================================
//  pang-finish — 모아팡 점수 확인 · 정산
//  브라우저는 점수 대신 '움직인 기록'만 보내요. 서버가 판 시드로 처음부터 다시 돌려서 점수를 직접 계산하고 정산해요.
//  Supabase 대시보드 → Edge Functions → Deploy a new function → 이름 "pang-finish" 로 이 파일 전체를 붙여넣기
//  ⚠ 위쪽 규칙(PangEngine)은 site/assets/js/pang-engine.js 와 같아야 해요 (그 파일을 고치면 build-pang-function.ps1 로 다시 만들어요)
// ================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
const PE = (globalThis as any).PangEngine;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // 1) 누구인지 확인
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: '로그인이 필요해요.' }, 401);
  const admin = createClient(url, service);
  // 2) 아직 정산 안 된 그 사람의 판 (자정을 넘겨 끝나도 그 판으로)
  const { data: g } = await admin.from('pang_plays').select('*').eq('user_id', user.id).eq('done', false).order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (!g) return json({ error: '정산할 게임이 없어요.' }, 400);
  const elapsed = Date.now() - Date.parse(g.started_at);
  if (elapsed < (g.secs - 5) * 1000) return json({ error: '아직 게임 시간이 끝나지 않았어요.' }, 400);
  // 3) 움직인 기록을 처음부터 다시 돌려서 점수 계산 · 실제로 흐른 시간보다 늦은 움직임이 있으면 무효
  const { moves } = await req.json().catch(() => ({ moves: [] }));
  let score = 0;
  if (elapsed <= (g.secs + PE.EXT_MAX + 300) * 1000) {
    const r = PE.replay({ seed: Number(g.seed), secs: g.secs, glass: !!g.glass }, moves);
    if (r.ok && r.last <= elapsed + 3000) score = r.score;
  }
  // 4) 정산 (영전 반영 · 기록)
  const { data, error } = await admin.rpc('pang_settle', { p_user: user.id, p_day: g.day, p_score: score });
  return error ? json({ error: error.message }, 400) : json(data);
});
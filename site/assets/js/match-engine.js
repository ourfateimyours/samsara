/* ================================================================
   대국 규칙 (화면 없이 규칙만)
   · 브라우저(대국 화면)와 서버(supabase/functions/match-move)가 이 파일을 똑같이 써요
   · 판 상태(state)는 JSON · 사람은 a(방장) · b(들어온 사람)
   · 체스 규칙은 chess.js (전역 Chess)
   ================================================================ */
(function (root) {
  const N = 15, RPS = ['r', 'p', 's'], BEATS = { r: 's', p: 'r', s: 'p' };
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const other = s => s === 'a' ? 'b' : 'a';
  const bad = m => { throw new Error(m); };
  const newState = game => ({ game, phase: 'rps', rps: { round: 1, a: null, b: null, prev: null } });
  const colorOf = (s, side) => side === s.first ? 'w' : 'b';
  const stoneOf = (s, side) => side === s.first ? 1 : 2;
  const withTurn = (fen, c) => { const f = fen.split(' '); f[1] = c; f[3] = '-'; return f.join(' '); };

  function startPlay(s) {
    s.phase = 'play'; s.turn = s.first; s.uses = { a: 2, b: 2 }; s.used = { a: [], b: [] }; s.extra = false; s.frozen = null; s.last = null; s.log = []; s.winner = null; s.why = '';
    if (s.game === 'gomoku') s.board = Array(N * N).fill(0);
    else s.fen = new root.Chess().fen();
  }
  function rps(s, side, pick) {
    if (s.phase !== 'rps') bad('가위바위보가 끝났어요.');
    if (!RPS.includes(pick)) bad('가위 · 바위 · 보 중에 골라 주세요.');
    if (s.rps[side]) bad('이미 냈어요.');
    s.rps[side] = pick;
    const { a, b, round } = s.rps;
    if (!a || !b) return s;
    if (a === b) { s.rps = { round: round + 1, a: null, b: null, prev: { a, b, round, tie: true } }; return s; }
    s.first = BEATS[a] === b ? 'a' : 'b';
    s.rps = { round, a, b, prev: { a, b, round, tie: false } };
    startPlay(s);
    return s;
  }
  function log(s, side, k, x) { s.log.push({ by: side, k, x: x == null ? '' : x }); if (s.log.length > 40) s.log.shift(); }
  function finish(s, winner, why) { s.winner = winner; s.why = why; s.phase = 'done'; return s; }
  function pass(s) { s.turn = other(s.turn); }
  function skillOk(s, side, k) {
    if (s.uses[side] < 1) bad('스킬을 다 썼어요.');
    if (s.used[side].includes(k)) bad('이 스킬은 이미 썼어요.');
    s.uses[side]--; s.used[side].push(k);
  }

  /* 오목 */
  const at = (b, x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? -1 : b[y * N + x];
  function winLine(b, i, p) {
    const x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of DIRS) {
      const cells = [i];
      for (const d of [1, -1]) { let k = 1; while (at(b, x + dx * k * d, y + dy * k * d) === p) { cells.push((y + dy * k * d) * N + x + dx * k * d); k++; } }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  function gomoku(s, side, a) {
    const b = s.board, me = stoneOf(s, side), op = 3 - me;
    if (a.t === 'place') {
      const i = a.i; if (!Number.isInteger(i) || i < 0 || i >= N * N || b[i]) bad('둘 수 없는 자리예요.');
      b[i] = me; s.last = i; log(s, side, 'place');
      const w = winLine(b, i, me);
      if (w) { s.line = w; return finish(s, side, '다섯 줄 완성'); }
      if (!b.includes(0)) return finish(s, 'draw', '판이 가득 찼어요');
      if (s.extra) { s.extra = false; return s; }
      pass(s); return s;
    }
    if (a.t === 'skill' && a.k === 0) {
      if (!Number.isInteger(a.i) || b[a.i] !== op) bad('상대 돌을 골라 주세요.');
      skillOk(s, side, 0); b[a.i] = 0; if (s.last === a.i) s.last = null; log(s, side, 'erase');
      s.extra = false; pass(s); return s;
    }
    if (a.t === 'skill' && a.k === 1) { if (s.extra) bad('이미 쓰고 있어요.'); skillOk(s, side, 1); s.extra = true; log(s, side, 'again'); return s; }
    bad('할 수 없는 동작이에요.');
  }

  /* 체스 */
  function chess(s, side, a) {
    const C = root.Chess, ch = new C(s.fen), my = colorOf(s, side), oc = my === 'w' ? 'b' : 'w';
    if (a.t === 'move') {
      if (s.frozen && s.frozen.side === side && s.frozen.sq === a.from) bad('얼어붙은 기물이에요.');
      const m = ch.move({ from: a.from, to: a.to, promotion: 'q' }); if (!m) bad('둘 수 없는 수예요.');
      s.fen = ch.fen(); s.last = { from: m.from, to: m.to }; if (s.frozen && s.frozen.side === side) s.frozen = null; log(s, side, 'move', m.san);
      if (ch.in_checkmate()) return finish(s, side, '체크메이트');
      if (ch.in_draw() || ch.in_stalemate()) return finish(s, 'draw', ch.in_stalemate() ? '스테일메이트' : '무승부');
      if (s.extra) {
        s.extra = false;
        if (!ch.in_check()) { const t = withTurn(s.fen, my), c2 = new C(t); if (c2.moves().length) { s.fen = t; return s; } }
      }
      pass(s); return s;
    }
    if (ch.in_check()) bad('체크일 때는 스킬을 쓸 수 없어요.');
    if (a.t === 'skill' && a.k === 0) {
      const p = ch.get(a.sq); if (!p || p.color !== oc || p.type === 'k') bad('상대 기물을 골라 주세요 (왕은 안 돼요).');
      const t = withTurn(s.fen, oc), c2 = new C(t), free = c2.moves({ verbose: true }).filter(m => m.from !== a.sq);
      if (!free.length) bad('그 기물은 얼릴 수 없어요.');
      skillOk(s, side, 0); s.frozen = { side: other(side), sq: a.sq }; s.fen = t; s.extra = false; log(s, side, 'freeze', a.sq); pass(s); return s;
    }
    if (a.t === 'skill' && a.k === 1) { if (s.extra) bad('이미 쓰고 있어요.'); skillOk(s, side, 1); s.extra = true; log(s, side, 'again'); return s; }
    bad('할 수 없는 동작이에요.');
  }

  /* 동작 하나 적용 → 새 상태 (규칙에 어긋나면 오류) */
  function apply(state, side, a) {
    const s = JSON.parse(JSON.stringify(state));
    if (side !== 'a' && side !== 'b') bad('이 대국의 사람이 아니에요.');
    if (a.t === 'rps') return rps(s, side, a.pick);
    if (s.phase !== 'play') bad('지금은 둘 수 없어요.');
    if (a.t === 'resign') return finish(s, other(side), '기권');
    if (s.turn !== side) bad('내 차례가 아니에요.');
    return s.game === 'gomoku' ? gomoku(s, side, a) : chess(s, side, a);
  }
  /* 시간 초과: 가위바위보 안 낸 쪽은 무작위 · 한 수 10분이 지나면 차례인 사람이 져요 */
  function rpsFill(state) {
    let s = JSON.parse(JSON.stringify(state));
    for (const side of ['a', 'b']) if (s.phase === 'rps' && !s.rps[side]) s = rps(s, side, RPS[Math.floor(Math.random() * 3)]);
    return s;
  }
  const clockOut = state => { const s = JSON.parse(JSON.stringify(state)); return finish(s, other(s.turn), '10분 동안 두지 않아 패배'); };

  root.MatchEngine = { N, newState, apply, rpsFill, clockOut, colorOf, stoneOf, other, winLine };
})(typeof window !== 'undefined' ? window : globalThis);

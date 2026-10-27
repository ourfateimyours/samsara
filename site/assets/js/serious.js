/* ================================================================
   2기 · 시리어스 메인 (index-serious.html 전용)
   서울시 재난관리 현황이 낮이고 밤이고 완전히 망가져요:
   · 제목 · 항목 이름 · 경계 단계 글자가 계속 깨진 글자로 바뀌고 (가끔 원래 글자가 번쩍)
   · 숫자는 쉬지 않고 바뀌고 (가끔 ERR · ??? · --)
   · 결계 게이지 · 막대가 마구 튀고, 판이 계속 지지직 깨져요
   메인 화면을 2기 버전으로 바꾸려면 이 파일을 index.html 로 이름만 바꿔 쓰면 돼요 (원래 index.html 은 따로 보관)
   ================================================================ */
(function () {
  const box = document.getElementById('sd'); if (!box) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.classList.add('broken');
  box.dataset.lv = '4';
  const GLYPH = '▓▒░█▚▞■□◆◇#%&@?!0123456789ERRNUL망량결계붕괴재난서울鎭封禁縛死';
  const pick = s => s[Math.floor(Math.random() * s.length)];
  // 깨진 글자: 원래 글자 일부를 무작위 기호로 바꿔요 (가끔은 원래 글자가 그대로 보여요)
  const scramble = (orig, rate) => [...orig].map(ch => ch.trim() && Math.random() < rate ? pick(GLYPH) : ch).join('');
  const FAKE = ['ERR', '???', '--', 'NULL', '0x0', '∞', '#!'];
  const LV_FAKE = ['심각', '붕괴', '통제불능', 'ERROR', '연결 끊김', '???', '봉인 해제'];
  // 원래 글자를 한 번만 기억해 둬요 (판이 새로 그려지면 새로 기억)
  const orig = el => { if (el.dataset.orig == null) el.dataset.orig = el.textContent; return el.dataset.orig; };

  function tick() {
    // 제목 · 항목 이름 · 구역
    box.querySelectorAll('.sd-head b, .sd-t, .sd-zone b, .sd-zone span, .sd-lv small, .sd-lvbox small, .sd-ring small').forEach(el => {
      const small = el.querySelector('small'); if (small) { orig(small); }
      const o = orig(el); el.textContent = Math.random() < .12 ? o : scramble(o, .35 + Math.random() * .4);
    });
    // 경계 단계 이름
    box.querySelectorAll('.sd-lv b').forEach(el => { el.textContent = Math.random() < .6 ? scramble(pick(LV_FAKE), .3) : pick(LV_FAKE); });
    // 숫자: 계속 바뀌고, 가끔 ERR · ???
    box.querySelectorAll('em').forEach(el => { el.textContent = Math.random() < .14 ? pick(FAKE) : Math.floor(Math.random() * (Math.random() < .3 ? 9999 : 100)); });
    // 결계 게이지 · 막대 마구 튀기
    box.querySelectorAll('.sd-ring .fg').forEach(c => { const len = parseFloat(c.style.strokeDasharray) || 132; c.style.transition = 'none'; c.style.strokeDashoffset = (len * Math.random()).toFixed(1); });
    box.querySelectorAll('.sd1-c.bar').forEach(c => c.style.setProperty('--p', Math.floor(Math.random() * 100) + '%'));
    // 단계 막대 깜빡이
    box.querySelectorAll('.sd-steps i').forEach(i => i.classList.toggle('on', Math.random() < .7));
    // 시각도 엉망으로
    const t = document.getElementById('sd-time'); if (t) t.textContent = Math.random() < .5 ? `${pick('0123456789')}${pick('0123456789')}:${pick('0123456789')}${pick('0123456789')} 오류` : '동기화 실패';
    box.classList.toggle('jolt', Math.random() < .18);   // 가끔 크게 덜컹
  }
  // 판이 새로 그려지면 (눌러서 새로 받기) 기억한 원래 글자도 새로 — 지울 필요 없이 새 요소라 저절로 새로 기억돼요
  setInterval(tick, REDUCED ? 900 : 110);
  tick();
  // 누르면 더 세게 깨져요
  box.addEventListener('click', () => { box.classList.remove('burst'); void box.offsetWidth; box.classList.add('burst'); });
})();

/* 배너(오른쪽 위 공지 창)도 망가져요: 글자가 깨지고 · 태그는 ERROR · 판이 붉게 떨려요 */
(function () {
  const hud = document.querySelector('.hud-panel'); if (!hud) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  hud.classList.add('broken');
  const GLYPH = '▓▒░█▚▞■□◆#%&@?!ERRNUL망량결계붕괴封禁縛死';
  const pick = s => s[Math.floor(Math.random() * s.length)];
  const scramble = (o, rate) => [...o].map(ch => ch.trim() && Math.random() < rate ? pick(GLYPH) : ch).join('');
  const TAGS = ['ERROR', 'NO SIGNAL', 'LOST', '???', 'WARNING'];
  setInterval(() => {
    document.querySelectorAll('#track .slide b, #track .slide p, #track .slide .when').forEach(el => {
      if (el.dataset.orig == null) el.dataset.orig = el.textContent;
      el.textContent = Math.random() < .15 ? el.dataset.orig : scramble(el.dataset.orig, .3 + Math.random() * .45);
    });
    document.querySelectorAll('#track .slide .tag, #hud-tag').forEach(el => { el.textContent = Math.random() < .5 ? pick(TAGS) : scramble(pick(TAGS), .4); });
    const no = document.getElementById('hud-no'); if (no) no.textContent = `${pick('0123456789')}${pick('0123456789')} / ??`;
    hud.classList.toggle('jolt', Math.random() < .15);
  }, REDUCED ? 900 : 140);
})();

/* 고양이도 글리치: 붉은 · 청록 잔상이 어긋나고, 가로로 잘린 조각이 밀리고, 가끔 덜컹 · 대사도 깨져요 */
(function () {
  const fig = document.getElementById('fig'), img = document.getElementById('fig-img'); if (!fig || !img) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  fig.classList.add('broken');
  const setSrc = () => { if (img.src) fig.style.setProperty('--cat', `url("${img.src}")`); };
  setSrc(); img.addEventListener('load', setSrc);
  // 잔상 두 겹 (그림을 그대로 깔고 색만 바꿔요)
  ['r', 'c'].forEach(k => { const g = document.createElement('i'); g.className = 'cat-ghost ' + k; g.setAttribute('aria-hidden', 'true'); fig.appendChild(g); });
  setInterval(() => fig.classList.toggle('jolt', Math.random() < .22), REDUCED ? 1500 : 260);
  // 대사: 원래 대사가 나온 뒤 가끔씩 글자가 깨져요
  const say = document.getElementById('say'); if (!say) return;
  const GLYPH = '▓▒░█■#%?!…냐앙ERR';
  setInterval(() => {
    if (say.classList.contains('typing')) return;
    if (say.dataset.orig == null || !say.textContent.match(/[▓▒░█■#%?!]/)) say.dataset.orig = say.textContent;
    const o = say.dataset.orig; say.textContent = Math.random() < .35 ? o : [...o].map(ch => ch.trim() && Math.random() < .25 ? GLYPH[Math.floor(Math.random() * GLYPH.length)] : ch).join('');
  }, REDUCED ? 1500 : 320);
})();
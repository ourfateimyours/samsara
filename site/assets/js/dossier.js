/* ================================================================
   캐릭터 상세 — 기밀 인물 파일
   ================================================================ */
App.ready.then(async user => {
  const stage = $('#stage');
  const id = qs('id');
  let row = null, all = [];
  try { [row, all] = await Promise.all([id ? Store.get('characters', id) : null, Store.list('characters')]); }
  catch (e) { console.error(e); }

  // 게시 전 캐릭터는 본인·관리자만 볼 수 있어요
  const isAdm = !!(user && user.grade === 'admin');
  const canSeeDraft = !!(row && user && (row.owner_id === user.id || isAdm));
  if (row && !row.published_at && !canSeeDraft) row = null;
  const orig = row;
  // 미리보기: 작성본으로 화면을 그려요 (?preview=1 이거나 아직 게시 전이면 자동)
  const previewing = !!(row && canSeeDraft && row.draft && (qs('preview') || !row.published_at));
  if (previewing) row = Object.assign({}, row, { data: row.draft });

  if (!row) {
    document.documentElement.classList.remove('booting');
    stage.innerHTML = `<div class="lyr kv-bg"></div>
      <div style="position:relative;z-index:2;height:100%;display:grid;place-items:center;text-align:center;padding:20px">
      <div><div style="font:400 140px/1 var(--han);color:var(--red)">失</div>
      <div class="eyebrow" style="margin:10px 0">ERROR 404 // FILE NOT FOUND</div>
      <p style="color:var(--muted);font-family:var(--body-serif)">기록이 지워졌거나, 처음부터 없었던 것 같아요.</p>
      <a class="btn ghost" href="characters.html">목록으로</a></div></div>`;
    return;
  }

  /* ---------- 데이터 ---------- */
  const d = normChar(row.data);
  const own = !!(user && user.id === row.owner_id);
  // 작성본 수정은 본인(언제나)·관리자만, 삭제는 관리자만
  const editPerm = await Store.can('save', orig), delPerm = await Store.can('delete');
  const subPerm = await Store.can('submit', orig);
  const mine = editPerm.ok;
  const el = ELEMENTS[d.element];
  const EN = (d.name_en || d.name || '?').toUpperCase();
  const chars = [...EN], cut = Math.ceil(chars.length / 2);
  const rIdx = RANKS.indexOf(d.rank);
  const org = d.org || 'ARCHIVE';
  const classFirst = (d.classline.split('·')[0] || '').trim();
  const fileNo = String(row.id).replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
  const others = new Map(all.map(c => [c.id, c]));
  const related = d.related.filter(r => others.has(r.id));
  const firstImg = charImage(row.data, row.id);
  const isDummy = !d.images.length;
  document.title = `${d.name} — ${SITE_CONFIG.siteName}`;
  stage.style.setProperty('--c', d.color);
  // 주인의 칭호 · 스탯 보너스 (상점에서 산 칭호, 스탯 증가권)
  const [badges, shopIt] = await Promise.all([Store.badges(), Store.shopItems(true)]).catch(() => [{}, []]);
  const badge = badges[row.owner_id];
  const ownerTitle = badge && badge.equip && badge.equip.title && shopIt.find(i => i.id === badge.equip.title && i.kind === 'title');
  const bonus = Store.statBonus(badge, shopIt, row.id);

  // 시드 고정 난수 (같은 캐릭터는 늘 같은 모양)
  let seed = [...String(row.id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- 그림 조각 ---------- */
  const OX = 928, OY = 396;
  function shardsSVG() {
    let s = '';
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2, r0 = 40 + rnd() * 110, L = 300 + rnd() * 900;
      const w = (.012 + rnd() * .05) * (i % 6 === 0 ? 2.6 : 1);
      const P = (ang, r) => `${(OX + Math.cos(ang) * r).toFixed(0)},${(OY + Math.sin(ang) * r).toFixed(0)}`;
      const cls = ['a', 'l', 'o', 'd', 'l', 'a', 'o'][i % 7];
      s += `<polygon class="s ${cls}" style="--i:${i}" points="${P(a - w, r0)} ${P(a, r0 + L)} ${P(a + w, r0)}"/>`;
    }
    // 크게 휘두른 붓자국 두 줄
    s += `<path class="s a" style="--i:4" d="M${OX - 620},${OY + 430} Q${OX - 40},${OY - 120} ${OX + 700},${OY - 380} Q${OX + 20},${OY - 40} ${OX - 620},${OY + 430}Z"/>`;
    s += `<path class="s l" style="--i:9" d="M${OX - 760},${OY - 60} Q${OX - 80},${OY + 30} ${OX + 820},${OY + 300} Q${OX - 60},${OY + 70} ${OX - 760},${OY - 60}Z"/>`;
    return `<svg class="shards" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style="--ox:${OX}px;--oy:${OY}px">
      <defs><filter id="ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${seed % 99}"/><feDisplacementMap in="SourceGraphic" scale="16"/></filter></defs>
      <g class="breath" filter="url(#ink)">${s}</g></svg>`;
  }

  /* ---------- 레이더 ---------- */
  function radarSVG() {
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const long = i % 6 === 0;
      ticks += `<line x1="100" y1="4" x2="100" y2="${long ? 13 : 8}" transform="rotate(${i * 5} 100 100)" stroke="currentColor" stroke-width="${long ? 1.3 : .6}" opacity="${long ? .95 : .5}"/>`;
    }
    const tri = ['111', '110', '101', '100', '011', '010', '001', '000'].map((p, k) =>
      `<g transform="rotate(${k * 45} 100 100) translate(100 26)">${[...p].map((b, i) => {
        const y = -i * 4.2;
        return b === '1' ? `<rect x="-8" y="${y}" width="16" height="2.4"/>` : `<rect x="-8" y="${y}" width="6.5" height="2.4"/><rect x="1.5" y="${y}" width="6.5" height="2.4"/>`;
      }).join('')}</g>`).join('');
    const blips = [0, 1, 2, 3].map(i => {
      const a = rnd() * 6.28, r = 20 + rnd() * 50;
      return `<circle class="blip" style="--bd:${(i * .8 + rnd()).toFixed(2)}s" cx="${(100 + Math.cos(a) * r).toFixed(1)}" cy="${(100 + Math.sin(a) * r).toFixed(1)}" r="2.4" fill="#fff"/>`;
    }).join('');
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="swg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset="1" stop-color="currentColor" stop-opacity=".6"/></linearGradient>
      <radialGradient id="rgl"><stop offset="0" stop-color="currentColor" stop-opacity=".4"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
      <circle cx="100" cy="100" r="98" fill="url(#rgl)" opacity=".45"/>
      <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" stroke-width=".9" opacity=".8"/>
      <g class="ra">${ticks}</g>
      <g class="rb" fill="currentColor" opacity=".8">${tri}</g>
      <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" stroke-width=".6" stroke-dasharray="2 4" opacity=".7"/>
      <circle cx="100" cy="100" r="38" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
      <path d="M100 30V170M30 100H170" stroke="currentColor" stroke-width=".4" opacity=".4"/>
      <g class="sw"><path d="M100 100 L100 6 A94 94 0 0 1 181.4 53 Z" fill="url(#swg)"/><line x1="100" y1="100" x2="181.4" y2="53" stroke="currentColor" stroke-width="1.4"/></g>
      ${blips}
      <g class="core"><rect x="85" y="85" width="30" height="30" transform="rotate(45 100 100)" fill="currentColor"/>
      <rect x="88" y="88" width="24" height="24" transform="rotate(45 100 100)" fill="none" stroke="#000" stroke-width=".8"/>
      <text class="el" x="100" y="110.5" text-anchor="middle" font-size="26">${esc(el ? el.han : '符')}</text></g>
    </svg>`;
  }
  /* 스킬 문장: 다이아 별 + 달 · 레벨이 오를수록 더해져요 (하얀색 · 가운데 다이아는 뚫려 있어요 · 캐릭터 색으로 빛나요)
     1단계 (~LV.2 · ~25%) 다이아 별
     2단계 (~LV.5 · ~50%) + 초승달 하나
     3단계 (LV.6 ~ MAX)  + 초승달 둘 · 작은 별 */
  const skTier = p => p > 50 ? 3 : p > 25 ? 2 : 1;
  const skEmblem = p => {
    const t = skTier(p);
    // 옆선이 안으로 휜 네 갈래 다이아 별 (위 · 오른쪽 · 아래 · 왼쪽 길이를 따로)
    const star = (cx, cy, u, r, d, l, k, h = 0) => `<path fill-rule="evenodd" d="M${cx} ${cy - u}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + d}Q${cx - k} ${cy + k} ${cx - l} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - u}Z${h ? `M${cx} ${cy - h}L${cx + h * .62} ${cy}L${cx} ${cy + h}L${cx - h * .62} ${cy}Z` : ''}"/>`;   // h: 가운데 다이아 구멍
    // 초승달: 바깥 원(반지름 36)과 오른쪽으로 비켜 간 안쪽 원 사이 · 양끝이 뾰족해요 · 오른쪽이 열려 있어요
    const moon = '<path d="M70.6 20.5A36 36 0 1 0 70.6 79.5A33.4 33.4 0 1 1 70.6 20.5Z"/>';
    const moon2 = `<g transform="translate(60 50) scale(.76) translate(-60 -50)">${moon}</g>`;
    const big = star(53, 50, t >= 3 ? 27 : t >= 2 ? 25 : 30, t >= 3 ? 27 : t >= 2 ? 25 : 30, t >= 3 ? 27 : t >= 2 ? 25 : 30, t >= 3 ? 27 : t >= 2 ? 25 : 30, t >= 2 ? 3.8 : 4.6, 6);
    return `<svg class="emb t${t}" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="embMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#f7f8fb"/><stop offset=".58" stop-color="#dfe3ea"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#eceff4"/></linearGradient></defs>
      <g fill="url(#embMetal)">${t >= 2 ? moon : ''}${t >= 3 ? moon2 : ''}${big}
        ${t >= 3 ? star(80, 17, 11, 8, 11, 8, 1.6) : ''}</g></svg>`;
  };
  /* ---------- 화면 조립 ---------- */
  // 이름 아래 신상: 나이 · 키 · 몸무게 (적은 것만)
  const bodyRow = BODY_KEYS.map(([k]) => [k, bodyOf(d)[k], { 나이: 'AGE', 키: 'HEIGHT', 몸무게: 'WEIGHT' }[k]]).filter(([, v]) => v);
  const tickItems = [d.codename, d.subtitle, 'SYSTEM ONLINE', EN, d.classline, org, d.team, el && `${el.han} · ${el.en}`].filter(Boolean);
  const tickHalf = tickItems.concat(tickItems).map(t => `<span>${esc(t)}</span>`).join('');
  const bandTxt = Array(10).fill(`${EN} ✦ ${d.codename || org} ✦ ${d.rank || 'CLASSIFIED'}`).map(t => `<span>${esc(t)}</span>`).join('');
  const lv = s => { const n = parseFloat(s); return isNaN(n) ? (s ? 100 : 0) : Math.max(0, Math.min(100, n <= 10 ? n * 10 : n)); };
  const showSkills = d.skills.slice(0, 4);
  // 스탯: 숫자 그대로 보여 주고, 막대는 가장 큰 값(최소 100) 기준
  const statMapD = Object.fromEntries(parseKV(d.stats));
  const statVals = STAT_KEYS.map(k => String(statMapD[k] == null ? '' : statMapD[k]).trim());
  const statTot = STAT_KEYS.map((k, i) => { const n = parseFloat(statVals[i]); return (isNaN(n) ? 0 : n) + (bonus[k] || 0); });
  const statMax = Math.max(100, ...statTot);
  // 소지품 카드: 작은 유리 카드 (그림 · 이름 · 짧은 소개 · 선물해 준 캐릭터) · 누르면 무기 창처럼 크게 펼쳐 보기
  // 선물한 캐릭터 = 편집 창의 "선물한 · 관련 캐릭터" · 그 캐릭터의 테마 색으로 리본이 물들어요
  const giverOf = it => { const rc = it.rel && others.get(it.rel); return rc ? { rc, name: (rc.data && rc.data.name) || '?', color: normChar(rc.data || {}).color } : null; };
  const itemCard = (it, i) => {
    const g = giverOf(it);
    return `<article class="gcard item-card" data-i="${i}" tabindex="0" style="--d:${(i * .1).toFixed(2)}s">
      <div class="g-img ${it.img ? '' : 'empty'}">${it.img ? `<img src="${esc(safeUrl(it.img))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span>物</span>'}</div>
      <span class="g-no">${pad2(i + 1)}</span>
      <div class="g-body"><b>${esc(it.name || '이름 없는 소지품')}</b>
        <p>${esc(it.desc || '아직 기록된 이야기가 없어요.')}</p>
        ${g ? `<small class="g-gift" style="--gc:${g.color}">♥ ${esc(g.name)}의 선물</small>` : ''}</div></article>`;
  };

  stage.innerHTML = `
    <div class="lyr kv-bg"></div>
    ${d.bgfx.url ? `<div class="lyr bgfx" aria-hidden="true" style="mix-blend-mode:${d.bgfx.mode};opacity:${d.bgfx.op}"><img id="bgfx-img" src="${esc(d.bgfx.url)}" alt="" referrerpolicy="no-referrer"></div>` : ''}
    <div class="lyr kv-word px" data-depth="10"><div class="row r1">${Array(6).fill(`<span>${esc(EN)}</span>`).join('')}</div>
      <div class="row r2">${Array(6).fill(`<span>${esc(d.codename || EN)}</span>`).join('')}</div></div>
    <div class="fig px ${isDummy ? 'dummy' : ''} ${d.figAlign !== 'center' ? 'al-' + d.figAlign : ''} ${d.figFade ? 'fade' : ''}" data-depth="-12" id="fig"><div class="fl"><img id="figimg" class="${silClass(d)}" src="${esc(firstImg)}" alt="${esc(d.name)}"></div></div>
    <div class="lyr px" data-depth="-24"><div class="kv-band"><div>${bandTxt}</div></div><div class="kv-band kv-band2"><div>${bandTxt}</div></div></div>

    <div class="lyr hud fixed-m"><span class="cb tl"></span><span class="cb tr"></span><span class="cb bl"></span><span class="cb br"></span>
      <div class="scan"></div><div class="noise"></div>
      <div class="rail l">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<i>${pad2(n)}</i>`).join('')}</div>
      <div class="rail r">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<i>${pad2(n)}</i>`).join('')}</div></div>

    <div class="top" id="top">
      <span class="rec">REC</span><span>LINK</span>
      <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span class="nav2">${user ? '<a href="#" data-tele-open style="position:relative">♥ TELEPATHY<b class="mail-badge" hidden></b></a>' : ''}<a href="characters.html">‹ CHARACTERS</a><a href="board.html">‹ BOARD</a><a href="index.html">‹ HOME</a></span>
    </div>

    <section class="pf">
      <div class="eb" id="eb"></div>
      <div class="sub">${esc(d.subtitle)}</div>
      ${ownerTitle ? '<div></div>' : d.classline ? `<div class="cls">[ ${esc(d.classline)} ]</div>` : '<div></div>'}
      <div class="nm-wrap"><h1 class="nm" id="nm" data-t="${esc(EN)}">${esc(chars.slice(0, cut).join(''))}<span class="o">${esc(chars.slice(cut).join(''))}</span></h1></div>
      <div class="kn">${ownerTitle ? `<span class="ttl-on" style="--tc:${esc(d.color)}" title="칭호"><b>${esc(Store.titleText(ownerTitle, badge.equip))}</b><i class="tt-d"></i></span>` : ''}<b>${esc(d.name)}</b><small>${esc(d.name)}</small></div>      ${d.team ? `<div class="team"><span>家門</span><b>${esc(d.team)}</b></div>` : '<div style="height:14px"></div>'}
      ${d.quote ? `<p class="desc">${esc(d.quote)}</p>` : '<div></div>'}
      <div class="ap"><div class="hd"><b>PROFILE</b><span>${esc(d.codename || 'No. ' + fileNo)}</span></div>
        <div class="bd"><button data-open="0"><span>PERSONA</span><b>성격 · 성향 보기</b><i>›</i></button>
        <button class="rlv" data-phone title="관계 휴대폰 열기"><span>RELATED</span><b>📱 ${pad2(related.length)}</b></button></div></div>
    </section>

    ${d.rank || el ? `<div class="dg">
      <div class="radar"><span class="ping"></span>${radarSVG()}</div>
      ${d.rank ? `<div class="info"><div class="lb"><span>DANGER CLASS</span><i>${rIdx >= 0 ? `${rIdx + 1} / ${RANKS.length}` : ''}</i></div>
        <div class="rk">${esc(d.rank.replace(/[+-]$/, ''))}<sup>${esc((d.rank.match(/[+-]$/) || [''])[0])}</sup></div>
        ${rIdx >= 0 ? `<div class="scale"><span class="ln"></span><span class="fill" id="sfill"></span><span class="mk" id="smk"></span>
          ${[['C', 1], ['B', 4], ['A', 7], ['S', 10], ['SS', 12]].map(([t, i]) => `<span class="t ${d.rank.replace(/[+-]$/, '') === t ? 'on' : ''}" style="left:${i / 12 * 100}%">${t}</span>`).join('')}</div>` : ''}
      </div>` : ''}</div>` : ''}

    ${d.images.length > 1 ? `<div class="imgsw" id="imgsw">${d.images.map((im, i) =>
      `<button class="th ${i ? '' : 'on'}" data-img="${i}" title="${esc(im.label)}"><img src="${esc(im.url)}" alt="" loading="lazy" decoding="async"><em>${esc(im.label || 'V' + (i + 1))}</em></button>`).join('')}
      <span class="hint">누르면 원본</span></div>` : ''}

    <aside class="pnl" id="pnl">
      <div class="win bgm" style="--i:0"><div class="wh"><b>Theme Song</b><span id="np"><i class="dot"></i><em id="npt">STANDBY</em></span></div>
        <div class="bgm-row"><button class="disc" id="pp" aria-label="재생"><span class="grv"></span><span class="pp" id="ppi">▶</span></button>
          <div class="bgm-r"><div class="wave" id="bar" title="누르면 그 위치로">${Array.from({ length: 40 }, (_, i) => `<i style="--h:${(22 + Math.abs(Math.sin(i * .9) * 48 + Math.sin(i * 2.3) * 24)).toFixed(0)}%;--wd:${((i * 37) % 9 / 10).toFixed(1)}s"></i>`).join('')}</div>
            <div class="bgm-t"><span id="t0">0:00</span><span id="t1">0:00</span></div></div></div>
      </div>

      ${bodyRow.length ? `<div class="win body-w" style="--i:0"><div class="bodyl">${bodyRow.map(([k, v, en]) => `<div><span>${en}</span><b>${esc(v)}</b></div>`).join('')}</div></div>` : ''}

      <div class="win" style="--i:1"><div class="wh"><b>Ability</b>${el ? `<span class="red">◉ ${esc(el.han)} · ${esc(el.en)}</span>` : ''}</div>
        ${d.ability.name ? `<div class="ab"><b>${esc(d.ability.name)}</b></div>` : ''}
        ${showSkills.length ? `<div class="sks">${showSkills.map((s, i) => `<button class="skc" data-skill="${i}">
          <span class="ico">${skEmblem(lv(s.lv))}</span><span class="no">S${i + 1}</span><span class="nmx">${esc(s.name)}</span>
          <span class="lv"><i style="--w:${lv(s.lv)}%"></i>LV.${esc(s.lv || '-')}</span></button>`).join('')}</div>`
          : (d.ability.name ? '' : '<p class="label" style="margin:0">NO DATA</p>')}
      </div>

      ${d.danger !== '' || d.rank ? `<div class="win" style="--i:2"><div class="dl"><span>DANGER LV. ${esc(d.rank || '')}</span><span class="bar"><i id="dbar"></i></span><b>${d.danger === '' ? '—' : d.danger + '%'}</b></div></div>` : ''}

      <div class="win" style="--i:4"><div class="wh"><b>Stats</b>${mine && (isAdm || !statVals.some(v => v !== '')) ? '<button class="plus" data-edit="stat" title="스탯 적기">+</button>' : ''}</div>
        <div class="pstats">${STAT_KEYS.map((k, i) => { const v = statVals[i], b = bonus[k] || 0, n = statTot[i];
          const shown = v === '' && !b ? '—' : (b ? String(n) : esc(v));
          return `<div style="--k:${i}"><span>${esc(k)}</span><i class="bar" style="--w:${Math.max(0, Math.min(100, n / statMax * 100))}%"><b></b>${b ? `<b class="bn" style="--l:${Math.max(0, Math.min(100, (n - b) / statMax * 100))}%;--w:${Math.min(100, b / statMax * 100)}%"></b>` : ''}</i><em>${shown === '—' ? shown : `<i class="sv" data-n="${n}">${shown}</i>`}${b ? `<sup class="bn">+${b}</sup>` : ''}</em></div>`; }).join('')}</div></div>

      <div class="win" style="--i:6"><div class="wh"><b>Archive</b><span id="nfiles"></span></div><ul class="slist" id="slist"></ul></div>

      <div class="win" style="--i:7"><div class="owner"><span>BY @${esc(row.author)} · ${fmtDate(row.created_at)}</span>
        <span style="display:flex;gap:6px">${mine ? '<button class="btn ghost sm" data-edit="basic">수정</button>' : ''}${delPerm.ok ? '<button class="btn ghost sm" id="del">삭제</button>' : ''}</span></div>
        ${own && !isAdm ? `<div class="lock-note ${subPerm.ok ? 'open' : ''}">${subPerm.ok ? `✎ 지금 제출할 수 있어요${subPerm.until ? ' · ' + esc(dday(subPerm.until)) : ''}` : '🔒 ' + esc(subPerm.reason) + ' 작성본 저장은 언제든 돼요.'}</div>` : ''}</div>
    </aside>

    <div class="ticker2"><div>${tickHalf}</div></div>
    <div id="yt" style="position:fixed;width:2px;height:2px;left:-20px;top:-20px;opacity:0;pointer-events:none"></div>`;

  if (window.Telepathy) Telepathy.refresh();

  /* 배경 효과 이미지: 원본 비율 그대로 화면 안에 다 보이게 놓고,
     화면과 비율이 달라 옆(또는 위아래)이 비면 그쪽 가장자리를 투명하게 흐려서 배경에 녹여요 */
  const fxImg = $('#bgfx-img');
  if (fxImg) {
    const fit = () => {
      const iw = fxImg.naturalWidth, ih = fxImg.naturalHeight; if (!iw || !ih) return;
      const box = fxImg.parentElement, sw = box.clientWidth, sh = box.clientHeight, s = Math.min(sw / iw, sh / ih);
      const w = iw * s, h = ih * s;
      fxImg.style.width = w + 'px'; fxImg.style.height = h + 'px';
      fxImg.classList.toggle('fx-x', w < sw - 2); fxImg.classList.toggle('fx-y', h < sh - 2);
    };
    if (fxImg.complete) fit(); else fxImg.onload = fit;
    addEventListener('resize', fit);
  }

  /* ---------- 미리보기 · 심사 바 ---------- */
  const ST = { draft: ['✎', '작성 중'], submitted: ['⏳', '심사 대기'], returned: ['↩', '반려됨'], published: ['✦', '게시됨'] };
  const hasPending = canSeeDraft && orig.draft && orig.status !== 'published';
  if (previewing || hasPending) {
    const st = ST[orig.status] || ST.draft;
    const kind = orig.published_at ? '수정본' : '첫 등록';
    const bar = document.createElement('div');
    bar.className = 'pv-bar' + (previewing ? '' : ' mini');
    const btn = (act, label, cls, dis) => `<button class="btn sm ${cls || 'ghost'}" data-pv="${act}" ${dis ? `disabled title="${esc(dis)}"` : ''}>${label}</button>`;
    let acts = '';
    if (!previewing) acts = `<a class="btn sm" href="character.html?id=${encodeURIComponent(orig.id)}&preview=1">👁 ${kind} 미리보기</a>`;
    else if (isAdm) acts = btn('edit', '✎ 수정') + (orig.status === 'submitted' ? btn('reject', '↩ 반려') : '') + btn('publish', '게시 ›', ' ');
    else acts = btn('edit', '✎ 계속 수정') + (orig.status === 'submitted' ? btn('withdraw', '제출 취소')
      : btn('submit', '제출하기', ' ', subPerm.ok ? '' : subPerm.reason));
    if (previewing && orig.published_at) acts += `<a class="btn sm ghost" href="character.html?id=${encodeURIComponent(orig.id)}">게시본 보기</a>`;
    bar.innerHTML = `<div class="pv-t"><b>${previewing ? '👁 미리보기' : '📝 게시 전 수정본이 있어요'}</b>
        <span class="pv-st s-${esc(orig.status || 'draft')}">${st[0]} ${st[1]}</span><small>${kind}${previewing ? ' · 아직 사이트에 보이지 않는 버전이에요' : ''}</small>
        ${orig.status === 'returned' && orig.review_note ? `<em>반려 메모: ${esc(orig.review_note)}</em>` : ''}</div>
      <div class="pv-a">${acts}</div>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', async e => {
      const b = e.target.closest('[data-pv]'); if (!b) return;
      try {
        if (b.dataset.pv === 'edit') return CharEditor.open(orig);
        if (b.dataset.pv === 'submit') { await Store.submit(orig.id); toast('제출했어요! 관리자가 확인한 뒤 게시돼요.'); return setTimeout(() => location.reload(), 700); }
        if (b.dataset.pv === 'withdraw') { await Store.withdraw(orig.id); toast('제출을 취소했어요. 다시 고칠 수 있어요.'); return setTimeout(() => location.reload(), 700); }
        if (b.dataset.pv === 'publish') { await Store.publish(orig.id); toast('게시했어요 ✦'); return setTimeout(() => location.href = 'character.html?id=' + encodeURIComponent(orig.id), 700); }
        if (b.dataset.pv === 'reject') {
          const note = await askPrompt('반려 메모 (회원에게 보여요)', ''); if (note == null) return;
          await Store.reject(orig.id, note); toast('반려했어요'); return setTimeout(() => location.reload(), 700);
        }
      } catch (ex) { toast(ex.message, 'err'); }
    });
  }

  /* ---------- 접속(부팅) 화면: 로스터에서 들어오면 ?boot=1 ---------- */
  const openSec = qs('open');
  if (qs('boot') && !REDUCED && window.LoginSeq) {
    // 접속 화면 → 셔터가 열리면 인물 파일 등장
    stage.classList.add('hold');
    LoginSeq.play({
      seed: row.id, color: d.color, img: firstImg, dummy: isDummy, sil: /\bsil\b/.test(silClass(d)),
      en: EN, name: d.name, org, subtitle: d.subtitle, classline: d.classline, rank: d.rank,
      codename: d.codename, team: d.team, group: d.team || org, ch: pad2((seed % 90) + 10)
    }).then(() => {
      stage.classList.remove('hold');
      if (openSec != null) setTimeout(() => openArc(+openSec), 500);
    });
    history.replaceState(null, '', 'character.html?id=' + encodeURIComponent(row.id));
  } else {
    document.documentElement.classList.remove('booting');
    if (openSec != null) setTimeout(() => openArc(+openSec), 400);
  }

  // 능력 이름이 칸보다 길면 한 줄에 들어갈 때까지 글자를 줄여요 (30px → 최소 14px · 글꼴을 다 받은 뒤 한 번 더)
  const fitAb = () => { const b = $('.ab b'); if (!b) return; b.style.fontSize = ''; let fs = parseFloat(getComputedStyle(b).fontSize); while (b.scrollWidth > b.clientWidth + 1 && fs > 14) { fs -= 1; b.style.fontSize = fs + 'px'; } };
  fitAb(); if (document.fonts) document.fonts.ready.then(fitAb); addEventListener('resize', fitAb);

  /* ---------- 움직임 ---------- */
  typeText($('#eb'), '天師監 // PROFILE · CLASSIFIED', 34);   // 고정 문구
  const nm = $('#nm');
  setInterval(() => { nm.classList.add('glitch'); setTimeout(() => nm.classList.remove('glitch'), 500); }, 5200);
  requestAnimationFrame(() => setTimeout(() => {
    if ($('#sfill')) { $('#sfill').style.width = (rIdx / 12 * 100) + '%'; $('#smk').style.left = (rIdx / 12 * 100) + '%'; }
    if ($('#dbar')) $('#dbar').style.width = (d.danger || 0) + '%';
  }, 50));
  // 스탯 숫자: 막대가 차오르는 동안 0부터 세어 올라가요
  $$('.pstats .sv').forEach((s, i) => { const n = +s.dataset.n; if (!isNaN(n) && Number.isInteger(n)) setTimeout(() => countUp(s, n, 1100), 500 + i * 90); });
  // 레일 눈금 깜박임
  const railI = $$('.rail i'); let ri = 0;
  setInterval(() => { railI.forEach(x => x.classList.remove('on')); ri = (ri + 1) % 8; $$('.rail').forEach(r => r.children[ri].classList.add('on')); }, 900);
  // 마우스 시차
  if (matchMedia('(pointer:fine)').matches && !REDUCED) {
    const lyrs = $$('.px', stage);
    // 마우스가 움직일 때마다 바로 쓰지 않고, 한 프레임에 한 번만 옮겨요
    let px = 0, py = 0, pq = 0;
    stage.addEventListener('pointermove', e => {
      px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5;
      if (pq) return;
      pq = requestAnimationFrame(() => {
        pq = 0; const wide = innerWidth > 1000, figCentered = d.figAlign === 'center';   // 끝에 붙인 그림은 가운데 맞춤(-50%)을 빼요
        lyrs.forEach(l => { const k = +l.dataset.depth; l.style.transform = `${l.id === 'fig' && wide && figCentered ? 'translateX(-50%) ' : ''}translate3d(${(-px * k).toFixed(1)}px, ${(-py * k).toFixed(1)}px, 0)`; });
      });
    }, { passive: true });
  }

  /* ---------- 이미지 버전 ---------- */
  // 가로로 긴 그림이면 칸을 넓히고 화면 가운데에 놓아요 (세로 전신용 좁은 칸에 맞춰 작아지거나 바닥에 붙지 않게)
  const figEl = $('#fig'), figImg = $('#figimg');
  const fitFig = () => { if (figImg.naturalWidth) figEl.classList.toggle('wide', figImg.naturalWidth > figImg.naturalHeight * 1.05); };
  figImg.addEventListener('load', fitFig); if (figImg.complete) fitFig();
  let imgIdx = 0;
  $$('#imgsw .th').forEach(b => b.onclick = () => {
    const i = +b.dataset.img;
    imgIdx = i;
    $$('#imgsw .th').forEach(x => x.classList.toggle('on', x === b));
    const img = $('#figimg'); img.classList.remove('swap'); void img.offsetWidth;
    img.src = d.images[i].url; img.classList.add('swap');
  });
  // 전신 그림을 눌러도 크게 열리지 않아요 (따로 보는 창은 없앴어요)

  /* ---------- 프로필 보호: 복사 · 잘라내기 · 우클릭 · 그림 끌어 저장 · 개발자 도구 · 소스 보기 단축키 막기 ----------
     편집 창(입력칸)에서는 평소처럼 복사 · 붙여넣기가 돼요 */
  const editable = e => !!(e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(ev => document.addEventListener(ev, e => { if (!editable(e)) e.preventDefault(); }));
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F12' || (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (mod && e.altKey && ['i', 'j', 'u'].includes(k))
      || (mod && ['u', 's', 'p'].includes(k)) || (mod && ['c', 'x', 'a'].includes(k) && !editable(e))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.body.classList.add('no-copy');

  /* ---------- 테마곡 플레이어 (유튜브 / mp3) ---------- */
  const songUrl = d.song.url || '';
  const ytId = (songUrl.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/) || [])[1];
  const isAudio = /^https?:\/\/.+\.(mp3|ogg|m4a|wav|aac)(\?.*)?$/i.test(songUrl);
  let yt = null, ytReady = false, audio = null, playing = false, userPaused = false;
  const fmt = s => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60)); };
  const setPlaying = p => {
    playing = p; stage.classList.toggle('playing', p);
    $('#ppi').textContent = p ? '❚❚' : '▶'; $('#npt').textContent = p ? 'NOW PLAYING' : 'STANDBY';
  };
  if (ytId) {
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player('yt', {
        videoId: ytId, playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
        events: { onReady: () => { ytReady = true; autoStart(); }, onStateChange: e => setPlaying(e.data === 1) }
      });
    };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  } else if (isAudio) {
    audio = new Audio(songUrl); audio.preload = 'metadata';
    ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, () => setPlaying(!audio.paused && !audio.ended)));
    autoStart();
  }
  // 테마곡 자동 재생: 열자마자 한 번 시도하고, 브라우저가 막으면(크롬은 화면을 누르기 전엔 소리를 막아요) 처음 누르는 순간 재생
  // (▶ 버튼을 직접 누른 경우 · 직접 멈춘 뒤에는 건드리지 않아요)
  function autoStart() {
    const go = () => { if (playing || userPaused) return; if (yt && ytReady) yt.playVideo(); else if (audio) audio.play().catch(() => {}); };
    go();
    const once = e => { if (e.target.closest && e.target.closest('#pp')) return; go(); };
    addEventListener('pointerdown', once, { once: true, capture: true });
    addEventListener('keydown', once, { once: true, capture: true });
  }
  const waveBars = $$('#bar i');
  const times = () => yt && ytReady ? [yt.getCurrentTime(), yt.getDuration()] : audio ? [audio.currentTime, audio.duration || 0] : [0, 0];
  $('#pp').onclick = () => {
    userPaused = playing;   // 재생 중에 눌러서 멈추면 그 뒤로는 자동 재생 안 해요
    if (yt) { if (!ytReady) return toast('플레이어를 불러오는 중이에요…'); playing ? yt.pauseVideo() : yt.playVideo(); }
    else if (audio) audio.paused ? audio.play().catch(() => toast('재생할 수 없는 주소예요.', 'err')) : audio.pause();
    else if (safeUrl(songUrl)) open(songUrl, '_blank', 'noopener');
    else toast('등록된 테마곡 링크가 없어요.');
  };
  $('#bar').onclick = e => {
    const [, dur] = times(); if (!dur) return;
    const r = e.currentTarget.getBoundingClientRect(), t = (e.clientX - r.left) / r.width * dur;
    if (yt) yt.seekTo(t, true); else if (audio) audio.currentTime = t;
  };
  setInterval(() => {
    const [cur, dur] = times(); const p = dur ? cur / dur * 100 : 0;
    $('#t0').textContent = fmt(cur); $('#t1').textContent = fmt(dur);
    waveBars.forEach((b, i) => b.classList.toggle('on', (i + .5) / waveBars.length * 100 <= p));   // 지나간 만큼 파형이 밝아져요
  }, 250);

  /* ---------- 아카이브 파일 ---------- */
  const empty = '<p class="text empty-sec">— NO RECORD ON FILE —</p>';
  const SEC = [
    { t: '성격', en: 'PERSONA', r: () => d.persona ? `<div class="text ps-out" style="${personaCSS(d.persona_style)}">${esc(d.persona)}</div>` : empty },
    { t: '스킬', en: 'SKILL', r: () => `
      ${d.ability.name ? `<div class="skh"><div class="skh-t"><small class="skh-k">ABILITY</small><b>${esc(d.ability.name)}</b><span class="skh-line" aria-hidden="true"><i></i></span></div>
        </div>` : ''}
      ${d.ability.desc ? `<div class="text sk-text" style="margin:14px 0 10px;${personaCSS(d.ability.style, ASTYLE_DEF)}">${esc(d.ability.desc)}</div>` : ''}
      ${d.skills.map((s, i) => `<div class="skr" data-sk="${i}"><button><span class="no">${pad2(i + 1)}</span><span class="sk-dm" aria-hidden="true"><i class="dm lg"></i></span>
        <span class="t"><small>SKILL ${pad2(i + 1)}</small><b>${esc(s.name)}</b></span>
        <span class="lvb"><i style="--w:${lv(s.lv)}%"></i>LV.${esc(s.lv || '-')}</span></button>
        <div class="dsc">${esc(s.desc || '설명이 없어요.')}</div></div>`).join('')}
      ${!d.ability.name && !d.skills.length ? empty : ''}` },

    { t: '소지품', en: 'BELONGINGS', r: () => d.items.length ? `<div class="items-grid">${d.items.map(itemCard).join('')}</div>` : empty }
  ];

  $('#nfiles').textContent = pad2(SEC.length) + ' FILES';
  $('#slist').innerHTML = SEC.map((s, i) => `<li><button data-open="${i}"><span class="n">${pad2(i + 1)}</span><span>${esc(s.t)}</span><span class="en">${esc(s.en)}</span></button></li>`).join('');

  const arc = document.createElement('div');
  arc.className = 'arc'; arc.hidden = true; arc.style.setProperty('--c', d.color);
  arc.innerHTML = `<aside class="side"><div class="hd"><small>ARCHIVE FILE</small><b>${esc(EN)}</b></div>
      <ol>${SEC.map((s, i) => `<li><button data-go="${i}"><span class="n">${pad2(i + 1)}</span><b>${esc(s.t)}</b><i>${esc(s.en)}</i></button></li>`).join('')}</ol>
      <div class="ft">${esc(org)} · ARCHIVE SYS.</div></aside>
    <section class="main"><header class="mh"><div><small id="asec"></small><h2 id="attl"></h2></div><em id="aen"></em>
      <button class="x" id="ax">CLOSE <span>×</span></button></header>
      <div class="mb" id="amb"></div>
      <footer class="mf"><div class="tk" id="atk"></div><button class="pv" id="apv"><small>PREV</small><b></b></button><button class="nx" id="anx"><small>NEXT</small><b></b></button></footer></section>`;
  document.body.appendChild(arc);
  let cur = 0;
  function go(i, opt = {}) {
    cur = (i + SEC.length) % SEC.length;
    const s = SEC[cur];
    $('#asec').textContent = 'SEC.' + pad2(cur + 1);
    $('#attl').textContent = s.t; $('#aen').textContent = s.en;
    $('#amb').innerHTML = `<div>${s.r()}</div>`;
    $('#amb').scrollTop = 0;
    $('#atk').textContent = `${org} ARCHIVE // ${d.subtitle || EN}-${pad2(cur + 1)} // CLEARANCE ${d.rank || 'N/A'}`;
    $('#apv b').textContent = SEC[(cur - 1 + SEC.length) % SEC.length].t;
    $('#anx b').textContent = SEC[(cur + 1) % SEC.length].t;
    $$('[data-go]', arc).forEach(b => b.classList.toggle('on', +b.dataset.go === cur));
    if (opt.skill != null) { const r = $(`.skr[data-sk="${opt.skill}"]`, arc); if (r) { r.classList.add('open'); r.scrollIntoView({ block: 'center' }); } }
  }
  function openArc(i, opt) { arc.hidden = false; arc.classList.add('arc-open'); document.body.classList.add('no-scroll', 'arc-on'); go(i, opt); }
  function closeArc() { arc.hidden = true; arc.classList.remove('arc-open'); document.body.classList.remove('arc-on'); if (innerWidth > 1000) document.body.classList.remove('no-scroll'); else document.body.classList.remove('no-scroll'); }
  $('#ax').onclick = closeArc;
  $('#apv').onclick = () => go(cur - 1);
  $('#anx').onclick = () => go(cur + 1);
  arc.addEventListener('click', e => {
    if (e.target === arc) return closeArc();
    if (e.target.closest('[data-phone]')) { closeArc(); return Phone.open(row, all); }
    const g = e.target.closest('[data-go]'); if (g) return go(+g.dataset.go);
    const sk = e.target.closest('.skr > button'); if (sk) return sk.parentElement.classList.toggle('open');
    const ed = e.target.closest('[data-edit]'); if (ed) { closeArc(); return CharEditor.open(row, ed.dataset.edit); }
    const ic = e.target.closest('.item-card'); if (ic && !e.target.closest('a')) return openItem(+ic.dataset.i);
  });
  // 소지품 카드를 누르면 크게 펼쳐 보기
  // 소지품 원본 그림 보기: 화면보다 작으면 원래 크기 그대로, 크면 화면에 맞춰 (자르지 않아요) · 아무 데나 누르면 닫혀요
  function showFull(src) {
    if (!src) return;
    const ov = document.createElement('div'); ov.className = 'img-full';
    ov.innerHTML = `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer"><span class="img-full-x">닫기 ✕</span>`;
    const close = () => { ov.remove(); removeEventListener('keydown', key, true); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    ov.onclick = close; addEventListener('keydown', key, true);
    document.body.appendChild(ov);
  }
  // 게임의 무기 · 장비 창처럼: 왼쪽은 빛나는 받침 위의 그림, 오른쪽은 이름 · 정보 칸 · 이야기
  function openItem(i) {
    const it = d.items[i]; if (!it) return;
    const g = giverOf(it), n = d.items.length;
    const m = openModal(`<div class="wpn" style="--c:${esc(d.color)}">
      <div class="wpn-art"><i class="wpn-grid"></i><i class="wpn-ring"></i><i class="wpn-ring r2"></i>
        ${it.img ? `<img src="${esc(safeUrl(it.img))}" alt="" referrerpolicy="no-referrer">` : '<span class="wpn-han">物</span>'}<i class="wpn-base"></i>
        <span class="wpn-slot">SLOT <b>${pad2(i + 1)}</b> / ${pad2(n)}</span></div>
      <div class="wpn-info">
        <small class="wpn-kick">BELONGING · 所持品</small>
        <h2>${esc(it.name || '이름 없는 소지품')}</h2>
        <div class="wpn-bar"><i></i></div>
        <dl class="wpn-stats"><div><dt>OWNER</dt><dd>${esc(d.name)}</dd></div>
          ${g ? `<div class="gift" style="--gc:${g.color}"><dt>GIFT FROM</dt><dd><a href="character.html?id=${encodeURIComponent(g.rc.id)}">♥ ${esc(g.name)}</a></dd></div>` : ''}</dl>
        <div class="wpn-lore"><small>DESCRIPTION</small><p>${esc(it.desc || '아직 기록된 이야기가 없어요.')}</p></div>
        ${n > 1 ? `<div class="wpn-nav"><button type="button" data-wi="${(i - 1 + n) % n}">‹ 이전</button><button type="button" data-wi="${(i + 1) % n}">다음 ›</button></div>` : ''}
      </div></div>`, 'item-modal');
    m.style.setProperty('--c', d.color);   // 창 바탕의 은은한 빛도 이 캐릭터 색으로 (기본 빨강 대신)
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-wi]'); if (b) return openItem(+b.dataset.wi);
      if (it.img && e.target.closest('.wpn-art')) showFull(safeUrl(it.img));   // 그림을 누르면 원본 그대로 크게
    });
    if (it.img) m.querySelector('.wpn-art').insertAdjacentHTML('beforeend', '<span class="wpn-zoom">원본 보기 ⤢</span>');
  }
  // 소지품 카드: NPC 카드처럼 마우스를 따라 3D로 기울고 빛이 반사돼요
  const tiltOk = matchMedia('(pointer:fine)').matches && !REDUCED;
  arc.addEventListener('pointermove', e => {
    if (!tiltOk) return;
    const c = e.target.closest('.mcard, .gcard'); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--ry', ((x - .5) * 16).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((.5 - y) * 14).toFixed(2) + 'deg');
    c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  });
  arc.addEventListener('pointerout', e => {
    const c = e.target.closest('.mcard, .gcard');
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
  });
  document.addEventListener('keydown', e => {
    if (arc.hidden || $('.modal-back')) return;
    if (e.key === 'Escape') closeArc();
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  });

  /* ---------- 패널 클릭 ---------- */
  stage.addEventListener('click', async e => {
    if (e.target.closest('a[href="#"]')) e.preventDefault();
    if (e.target.closest('[data-phone]')) return Phone.open(row, all);
    const o = e.target.closest('[data-open]'); if (o) return openArc(+o.dataset.open);
    const sk = e.target.closest('[data-skill]'); if (sk) return openArc(1, { skill: +sk.dataset.skill });
    const ed = e.target.closest('[data-edit]'); if (ed) return CharEditor.open(row, ed.dataset.edit);
    if (e.target.closest('#del')) {
      if (!await askConfirm(`"${d.name}" 기록을 삭제할까요? 되돌릴 수 없어요.`)) return;
      try { await Store.remove('characters', row.id); location.href = 'characters.html'; }
      catch (ex) { toast(ex.message, 'err'); }
    }
  });
});

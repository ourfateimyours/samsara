/* ================================================================
   캐릭터 데이터 모델 + 등록/수정 폼 (목록·상세 페이지 공용)
   모든 내용은 row.data (JSON) 안에 저장돼요.
   ================================================================ */
window.RANKS = ['C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+', 'SS'];

window.parseKV = text => String(text || '').split('\n')
  .map(l => l.trim()).filter(Boolean)
  .map(l => { const i = l.search(/[:：]/); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });

/* 모두에게 똑같이 들어가는 고정 문구 (플레이어가 적는 칸은 없어요) */
window.FIXED = { subtitle: 'The Divine Bloodline', classline: '신의 피가 우리에게 흐를 때까지', codename: '神裔' };
/* 가문: 셋 중 하나만 고를 수 있어요 (멤버란도 이 순서로 나뉘어요) */
window.HOUSES = ['瑞門', '誓門', '染'];
/* 스탯 항목 (숫자로 관리) */
window.STAT_KEYS = ['근력', '지력', '이성', '술력', '외모', '재력', '행운'];

/* 성격 글 서식: 글씨체 · 크기(9~14pt) · 자간(-2.0~1.0px) · 행간(기본 1.8에서 -1.0~+1.0) */
window.PERSONA_FONTS = {
  batang: ['바탕', "Batang, BatangChe, 'Nanum Myeongjo', 'Noto Serif KR', serif"],
  dotum: ['돋움', "Dotum, DotumChe, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"],
  gulim: ['굴림', "Gulim, GulimChe, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"],
  plexmono: ['IBM Plex Mono', "'IBM Plex Mono', 'IBM Plex Sans KR', monospace"]   // 한글은 IBM Plex Sans KR 로
};
window.normPStyle = (s = {}) => {
  const c = (v, a, b, d) => { const n = parseFloat(v); return isNaN(n) ? d : Math.max(a, Math.min(b, n)); };
  return { font: PERSONA_FONTS[s.font] ? s.font : 'batang', size: Math.round(c(s.size, 9, 14, 11)),
    ls: Math.round(c(s.ls, -2, 1, 0) * 10) / 10, lh: Math.round(c(s.lh, -1, 1, 0) * 10) / 10 };
};
window.personaCSS = s => { s = normPStyle(s); return `font-family:${PERSONA_FONTS[s.font][1]};font-size:${s.size}pt;letter-spacing:${s.ls}px;line-height:${(1.8 + s.lh).toFixed(1)}`; };

/* 나이 · 키 · 몸무게 (profile 칸에 "항목: 내용" 줄로 저장돼요) */
window.BODY_KEYS = [['나이', 'p_age', ''], ['키', 'p_h', ''], ['몸무게', 'p_w', '']];
window.bodyOf = d => Object.fromEntries(parseKV((d && d.profile) || ''));

/* 배경 효과 이미지를 섞는 방식 */
window.BGFX_MODES = { screen: '스크린 · 검은 바탕이 사라지고 빛만 (빛망울 · 별 · 불꽃)', multiply: '곱하기 · 흰 바탕이 사라지고 어두운 것만', overlay: '오버레이 · 대비를 살려 은은하게', 'soft-light': '소프트 라이트 · 가장 부드럽게' };

/* 예전 형식 데이터도 새 형식으로 맞춰 줌 */
window.normChar = (d = {}) => {
  const images = (d.images && d.images.length ? d.images : (d.image ? [{ label: '원본', url: d.image }] : []))
    .filter(i => safeUrl(i.url));
  const song = d.song || { title: d.song_title || '', artist: d.song_artist || '', url: d.song_url || '', cover: '' };
  return {
    name: d.name || '', name_en: d.name_en || '', subtitle: FIXED.subtitle, org: d.org || d.affiliation || '',
    classline: FIXED.classline, team: HOUSES.includes(d.team) ? d.team : '', codename: FIXED.codename, quote: d.quote || '',
    rank: RANKS.includes(d.rank) ? d.rank : (d.rank || ''), color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#c8161d',
    element: '', images, song,   // 오행 속성은 쓰지 않아요
    ability: Object.assign({ name: '', sub: '', desc: '' }, d.ability),
    skills: d.skills || [], danger: d.danger === '' || d.danger == null ? '' : Math.max(0, Math.min(100, +d.danger || 0)),
    persona: d.persona || '', persona_style: normPStyle(d.persona_style), persona_tags: d.persona_tags || [], profile: d.profile || '', stats: d.stats || '',
    prompts: d.prompts || [], custom: d.custom || [], related: d.related || [], sections: d.sections || [],
    tags: d.tags || [], 
      keyring: Object.assign({ type: 'none', text: '', img: '' }, d.keyring || (d.charmImg ? { type: 'acrylic', img: d.charmImg } : {})), silhouette: false, card: false,   // 검은 실루엣 · 카드 액자 표시는 없앴어요 (예전 기록에 켜져 있어도 꺼진 채로)
    items: (d.items || []).slice(0, 6),
    head: safeUrl(d.head) ? d.head : '',   // 두상 · 움짤 (멤버란 전용)
    // 프로필 배경 효과 이미지: 전신 뒤 배경 위에 섞어 얹어요 (빛망울 · 먼지 · 안개 같은 그림)
    bgfx: (o => ({ url: safeUrl(o.url) ? o.url : '', mode: BGFX_MODES[o.mode] ? o.mode : 'screen', op: Math.max(.1, Math.min(1, parseFloat(o.op) || .8)) }))(d.bgfx || {})
  };
};

/* ---------- 반복 입력 목록 ---------- */
function listEditor(box, items, fields, addLabel, blank, max) {
  const list = document.createElement('div'); list.className = 'sub-list';
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'icon-btn'; add.textContent = '+ ' + addLabel;
  box.append(list, add);
  const row = (it = {}) => {
    const el = document.createElement('div'); el.className = 'sub-item';
    const tops = fields.filter(f => !f.full && !f.row), fulls = fields.filter(f => f.full);
    const rowKeys = [...new Set(fields.filter(f => f.row).map(f => f.row))];
    const ctl = f => {
      const v = it[f.k];
      if (f.type === 'select') return `<select class="input" data-k="${f.k}">${f.options().map(([val, lab]) => `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      if (f.type === 'action') return `<button type="button" class="btn ghost sm le-act" data-k="${f.k}">${esc(f.label)}</button>`;
      if (f.type === 'check') return `<label class="chk"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}>${esc(f.ph)}</label>`;
      if (f.type === 'textarea') return `<textarea class="input" data-k="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
      if (f.type === 'img') return `<div class="img-pick"><div class="thumb" style="background-image:${cssUrl(v)}"></div><div class="ctrl">
        <input class="input" type="url" inputmode="url" data-k="${f.k}" placeholder="이미지 외부 링크 https://…" value="${esc(String(v || '').startsWith('data:') ? '' : v)}">
        <small class="hint-text" style="margin:0">이미지는 외부 링크로만 넣을 수 있어요 (이미지 주소 복사 → 붙여넣기)</small></div></div>`;
      return `<input class="input ${f.narrow ? 'narrow' : ''}" data-k="${f.k}" placeholder="${esc(f.ph || '')}" value="${esc(v)}" ${f.max ? `maxlength="${f.max}"` : ''}>`;
    };
    el.innerHTML = `<div class="le-row">${tops.map(ctl).join('')}<button type="button" class="icon-btn" data-up title="위로">↑</button><button type="button" class="icon-btn" data-rm aria-label="삭제">×</button></div>${fulls.map(ctl).join('')}${rowKeys.map(k => `<div class="le-row">${fields.filter(f => f.row === k).map(ctl).join('')}</div>`).join('')}`;
    // 이미지 칸: 업로드하면 data URL 을 숨은 값으로 보관
    const imgF = fields.find(f => f.type === 'img');
    if (imgF) {
      el._img = it[imgF.k] || '';
      const th = el.querySelector('.thumb'), url = el.querySelector(`[data-k="${imgF.k}"]`);

      url.oninput = () => { el._img = url.value.trim(); th.style.backgroundImage = cssUrl(el._img); };
    }
    // 칸 보이기 조건 (f.show(지금 값)) · 값이 바뀔 때마다 다시 계산해요
    const vals = () => Object.fromEntries(fields.filter(f => f.type !== 'action' && f.type !== 'img').map(f => { const c = el.querySelector(`[data-k="${f.k}"]`); return [f.k, c ? (f.type === 'check' ? c.checked : c.value) : '']; }));
    const vis = () => {
      const v = vals();
      fields.filter(f => f.show).forEach(f => { const c = el.querySelector(`[data-k="${f.k}"]`); if (c) c.hidden = !f.show(v); });
      el.querySelectorAll('.le-row').forEach(r => { const kids = [...r.children].filter(x => !x.matches('[data-up],[data-rm]')); if (kids.length) r.hidden = kids.every(x => x.hidden); });
    };
    el.addEventListener('input', vis); el.addEventListener('change', vis); vis();
    fields.filter(f => f.type === 'action').forEach(f => { el.querySelector(`[data-k="${f.k}"]`).onclick = () => f.onClick(vals()); });
    el.querySelector('[data-rm]').onclick = () => el.remove();
    el.querySelector('[data-up]').onclick = () => { if (el.previousElementSibling) list.insertBefore(el, el.previousElementSibling); };
    list.appendChild(el);
  };
  (items.length ? items : (blank ? [{}] : [])).forEach(row);
  // 새 칸을 추가하면 그 칸으로 부드럽게 이동하고 첫 입력칸에 커서를 둬요
  const sync = () => { if (max) add.hidden = list.children.length >= max; };
  list.addEventListener('click', e => { if (e.target.closest('[data-rm]')) setTimeout(sync); });
  sync();
  add.onclick = () => {
    if (max && list.children.length >= max) return toast(`최대 ${max}개까지 넣을 수 있어요.`);
    row(); sync();
    const el = list.lastElementChild; if (!el) return;
    const box = el.closest('.modal-in');
    if (box) {
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      box.scrollTop += r.top - b.top - (b.height - r.height) / 2; // 새 칸을 창 가운데로
    }
    el.animate([{ outline: '1px solid rgba(200,22,29,.9)' }, { outline: '1px solid rgba(200,22,29,0)' }], { duration: 1200 });
    const f = el.querySelector('input:not([type=file]):not([type=checkbox]), textarea, select'); if (f) f.focus({ preventScroll: true });
  };
  return () => $$('.sub-item', list).map(el => {
    const o = {};
    fields.filter(f => f.type !== 'action').forEach(f => {
      const c = el.querySelector(`[data-k="${f.k}"]`);
      o[f.k] = f.type === 'img' ? el._img : f.type === 'check' ? c.checked : c.value.trim();
    });
    return o;
  }).filter(o => fields.some(f => f.type !== 'check' && f.type !== 'action' && o[f.k]));
}

// 관계란 한 줄 정리: 고른 알림 종류에 맞는 칸만 남겨요 (관계 이름 · 혈연 · 설명은 더 이상 쓰지 않아요)
const cleanRel = r => {
  const o = { id: r.id, msgType: r.msgType || '' };
  if (o.msgType === 'imessage' || o.msgType === 'sms') o.msg = r.msg || '';
  if (o.msgType === 'missed') { o.time = r.time || ''; o.missed = r.missed || ''; }
  return o;
};
// 휴대폰 화면(phone.js · phone.css)이 없는 페이지에서 미리보기를 누르면 그때 불러와요
const loadPhone = () => new Promise((ok, no) => {
  if (!document.querySelector('link[href*="phone.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/phone.css'; document.head.appendChild(l); }
  const add = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = r; document.body.appendChild(s); });
  (window.Keyring ? Promise.resolve() : add('assets/js/keyring.js')).then(() => add('assets/js/phone.js')).then(() => window.Phone ? ok() : no(new Error('휴대폰 화면을 불러오지 못했어요.')));
});

window.CharEditor = {
  async open(row, tab) {
    const perm = await Store.can('save', row);
    if (!perm.ok) { toast(perm.reason, 'err'); return; }
    const isAdmin = await Store.isAdmin();
    const subPerm = await Store.can('submit', row);
    // 작성본이 있으면 작성본을, 없으면 게시본을 불러와요
    const d = normChar(row && (row.draft || row.data));
    let others = [];
    try { others = (await Store.list('characters')).filter(c => !row || c.id !== row.id); } catch (e) {}
    // 스탯은 처음 한 번 적고 나면 관리자만 고칠 수 있어요 (게시된 기록에 스탯이 있으면 잠김)
    const pub = row && row.data ? normChar(row.data) : null;
    const statLocked = !isAdmin && !!(pub && parseKV(pub.stats).some(([, v]) => v !== ''));
    const statMap = Object.fromEntries(parseKV(d.stats));
    const TABS = [['basic', '기본'], ['img', '이미지'], ['song', '테마곡'], ['skill', '능력·스킬'], ['persona', '성격·프로필'],
      ['stat', '스탯'], ['items', '소지품'], ['rel', '관계란']];
    const m = openModal(`
      <h2>${row ? '인물 기록 수정' : '새 인물 봉인'}</h2>
      <div class="etabs">${TABS.map(([k, l], i) => `<button type="button" data-t="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
      <form id="cf" novalidate>
        <div class="epane on" data-p="basic">
          <div class="row2">
            <label class="field"><span>이름 *</span><input name="name" maxlength="30" value="${esc(d.name)}"></label>
            <label class="field"><span>영문 표기 <small>크게 표시돼요</small></span><input name="name_en" maxlength="20" value="${esc(d.name_en)}"></label>
          </div>
          <div class="row3">
            <label class="field"><span>가문 * <small>멤버란이 이 가문으로 나뉘어요</small></span><select name="team"><option value="">— 가문 선택 —</option>${HOUSES.map(h => `<option ${h === d.team ? 'selected' : ''}>${h}</option>`).join('')}</select></label>
            <label class="field"><span>소속 기관</span><input name="org" maxlength="30" value="${esc(d.org)}"></label>
            <label class="field"><span>위험 등급</span><select name="rank"><option value="">—</option>${RANKS.map(r => `<option ${r === d.rank ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>한마디</span><textarea name="quote" rows="2" maxlength="200">${esc(d.quote)}</textarea></label>
          <div class="row3">
            <label class="field"><span>테마 컬러</span><input type="color" name="color" value="${esc(d.color)}"></label>
            
          </div>
          <div class="kr-ed">
            <div class="kr-f">
              <div class="field"><span>휴대폰 키링 <small>관계 휴대폰 오른쪽 위 고리에 달려요</small></span>
                <div class="kr-types">${Object.entries((window.Keyring || { TYPES: { none: '없음' } }).TYPES).map(([k, n]) => `<label class="kr-chip"><input type="radio" name="kr_type" value="${k}" ${k === d.keyring.type ? 'checked' : ''}><b>${esc(n)}</b></label>`).join('')}</div></div>
              <label class="field kr-txt"><span>영어 글자 <small>영문 · 숫자 최대 10자 · 은색 큐브로 꿰어져요</small></span><input name="kr_text" maxlength="10" value="${esc(d.keyring.text)}"></label>
              <label class="field kr-img"><span>아크릴 이미지 <small>배경이 투명한 PNG 링크를 넣으면 그 모양대로 아크릴이 돼요</small></span><input name="kr_img" type="url" inputmode="url" value="${esc(d.keyring.img)}" placeholder="https://…png"></label>
            </div>
            <div class="kr-prev" id="kr-prev" aria-label="키링 미리보기"></div>
          </div>
        </div>

        <div class="epane" data-p="img">
          <div class="field head-field"><span>두상 · 움짤 <small>멤버란 카드에만 보여요 · 권장 500×800 (5:8) · GIF 가능 · 2MB 이하 추천</small></span>
            <div class="img-pick"><div class="thumb head" id="hd-th" style="background-image:${cssUrl(d.head)}"></div>
              <div class="ctrl"><input name="head" type="url" inputmode="url" placeholder="움짤 / 이미지 외부 링크 https://…" value="${esc(d.head)}">
              <small class="hint-text" style="margin:0">비워 두면 멤버란 카드에 전신 그림이 대신 들어가요.</small></div></div></div>
          <p class="hint-text" style="margin-top:18px"><b>전신</b> · 인트로와 프로필에 보여요. 여러 장을 넣으면 화면 아래에서 버전을 바꿔 볼 수 있어요. 투명 배경 전신 그림을 추천해요.<br>그림을 비워 두면 기본 실루엣이 들어가요.</p>
          <div id="e-img"></div>
          <div class="field bgfx-ed" style="margin-top:20px"><span>배경 효과 이미지 <small>프로필 전신 뒤 배경 위에 섞어 얹어요 · 빛망울 · 별가루 · 안개 사진 추천</small></span>
            <div class="img-pick"><div class="thumb" id="fx-th" style="background-image:${cssUrl(d.bgfx.url)}"></div>
              <div class="ctrl"><input name="fx_url" type="url" inputmode="url" placeholder="이미지 외부 링크 https://… (비우면 없음)" value="${esc(d.bgfx.url)}">
                <div class="row2" style="margin:8px 0 0"><label class="field" style="margin:0"><span>섞는 방식</span><select name="fx_mode">${Object.entries(BGFX_MODES).map(([k, l]) => `<option value="${k}" ${k === d.bgfx.mode ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                  <label class="field" style="margin:0"><span>진하기 <small data-fxv>${Math.round(d.bgfx.op * 100)}%</small></span><input type="range" name="fx_op" min="0.1" max="1" step="0.05" value="${d.bgfx.op}"></label></div></div></div></div>
        </div>

        <div class="epane" data-p="song">
          <label class="field"><span>유튜브 링크 또는 mp3 주소 <small>프로필에서 재생바로만 나와요 · 재생하면 파형이 움직여요</small></span><input name="s_url" value="${esc(d.song.url)}" placeholder="https://youtu.be/…"></label>
        </div>

        <div class="epane" data-p="skill">
          <div class="row3">
            <label class="field"><span>능력 이름 <small>한자 추천</small></span><input name="a_name" value="${esc(d.ability.name)}"></label>
            <label class="field"><span>위험도 % <small>0~100</small></span><input name="danger" type="number" min="0" max="100" value="${esc(d.danger)}"></label>
          </div>
          <label class="field"><span>능력 설명</span><textarea name="a_desc" rows="3">${esc(d.ability.desc)}</textarea></label>
          <div class="field"><span>스킬</span><div id="e-skill"></div></div>

        </div>

        <div class="epane" data-p="persona">
          <div class="ps-bar">
            <label class="field"><span>글씨체</span><select name="ps_font">${Object.entries(PERSONA_FONTS).map(([k, [n]]) => `<option value="${k}" ${k === d.persona_style.font ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>글자 크기</span><select name="ps_size">${[9, 10, 11, 12, 13, 14].map(n => `<option value="${n}" ${n === d.persona_style.size ? 'selected' : ''}>${n}pt</option>`).join('')}</select></label>
            <label class="field"><span>자간 <small data-psv="ls">${d.persona_style.ls.toFixed(1)}</small></span><input type="range" name="ps_ls" min="-2" max="1" step="0.1" value="${d.persona_style.ls}"></label>
            <label class="field"><span>행간 <small data-psv="lh">${d.persona_style.lh.toFixed(1)}</small></span><input type="range" name="ps_lh" min="-1" max="1" step="0.1" value="${d.persona_style.lh}"></label>
          </div>
          <label class="field"><span>성격 · 성향 <small>쓴 그대로(줄바꿈 · 띄어쓰기 · 서식) 프로필에 나와요</small></span><textarea name="persona" rows="10" class="ps-text" style="${personaCSS(d.persona_style)}">${esc(d.persona)}</textarea></label>

          <div class="row3">${BODY_KEYS.map(([k, n, ph]) => `<label class="field"><span>${k} <small>프로필 이름 아래에 보여요</small></span><input name="${n}" maxlength="20" value="${esc(bodyOf(d)[k] || '')}" placeholder="${ph}"></label>`).join('')}</div>
        </div>

        <div class="epane" data-p="stat">
          <p class="hint-text">숫자로 적어 주세요. ${statLocked ? '<b style="color:#ffcf6b">🔒 스탯은 처음 등록한 뒤로는 관리자만 고칠 수 있어요.</b>' : '처음 등록한 뒤로는 <b>관리자만</b> 고칠 수 있으니 신중하게 적어 주세요.'}</p>
          <div class="stat-grid">${STAT_KEYS.map(k => `<label class="field"><span>${k}</span><input type="number" inputmode="numeric" name="st_${k}" value="${esc(statMap[k] || '')}" ${statLocked ? 'disabled' : ''}></label>`).join('')}</div>
        </div>
        <div class="epane" data-p="items"><p class="hint-text">아카이브의 <b>소지품</b> 칸에 카드로 보여요. 최대 6개까지 넣을 수 있어요. 캐릭터를 고르면 카드에 <b>♥ (캐릭터)의 선물</b>로 표시돼요.</p><div id="e-items"></div></div>
        <div class="epane" data-p="rel"><p class="hint-text">캐릭터를 고르고 알림을 골라요. 아이메시지 · 문자는 메시지를, 부재중 전화는 시각 · 횟수를 적으면 <b>상대 캐릭터 휴대폰 잠금 화면</b>에 떠요 · <b>📱 미리보기</b>로 어떻게 보일지 확인할 수 있어요.</p><div id="e-rel"></div></div>


        ${row && row.status === 'submitted' ? '<p class="hint-text" style="color:#ffcf6b">⏳ 지금 심사 대기 중이에요. 저장하면 제출이 취소되고 "작성 중"으로 돌아가요.</p>' : ''}
        ${row && row.status === 'returned' && row.review_note ? `<p class="hint-text" style="color:#ff8a80">↩ 반려 메모: ${esc(row.review_note)}</p>` : ''}
        ${row && row.published_at ? '<p class="hint-text">고친 내용은 <b>작성본</b>으로 저장돼요. 게시되기 전까지 사이트에는 지금 게시된 모습이 그대로 보여요.</p>' : ''}
        <p class="err-text" id="cerr"></p>
        <div class="modal-foot">
          <button type="button" class="btn ghost" data-cancel>취소</button>
          <button class="btn ghost" data-act="save">작성본 저장</button>
          <button class="btn ghost" data-act="preview">👁 미리보기</button>
          ${isAdmin ? '<button class="btn" data-act="publish">게시 ›</button>' : `<button class="btn" data-act="submit" ${subPerm.ok ? '' : 'disabled'}>제출하기</button>`}
        </div>
        ${!isAdmin && !subPerm.ok ? `<p class="hint-text" style="text-align:right;margin-top:8px">🔒 ${esc(subPerm.reason)} (작성본 저장은 언제든 돼요)</p>` : ''}
      </form>`, 'wide');

    $$('.etabs button', m).forEach(b => b.onclick = () => {
      $$('.etabs button', m).forEach(x => x.classList.toggle('on', x === b));
      $$('.epane', m).forEach(p => p.classList.toggle('on', p.dataset.p === b.dataset.t));
      const bar = b.parentElement; bar.scrollLeft = b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2; // 고른 탭이 보이게
    });
    if (tab) { const b = $(`.etabs [data-t="${tab}"]`, m); if (b) b.click(); }

    const getImgs = listEditor($('#e-img', m), d.images, [{ k: 'url', type: 'img', full: true }], '이미지 추가', true);
    const getSkills = listEditor($('#e-skill', m), d.skills, [
      { k: 'name', ph: '스킬 이름', max: 30 }, { k: 'lv', ph: 'LV', narrow: true, max: 3 },
      { k: 'desc', type: 'textarea', ph: '설명', rows: 2, full: true }], '스킬 추가', !row);
    const getItems = listEditor($('#e-items', m), d.items, [
      { k: 'name', ph: '소지품 이름', max: 30 },
      { k: 'rel', type: 'select', options: () => [['', '— 선물한 · 관련 캐릭터 (선택) —']].concat(others.map(c => [c.id, (c.data && c.data.name) || '?'])) },
      { k: 'img', type: 'img', full: true },
      { k: 'desc', type: 'textarea', ph: '소개 / 이야기', rows: 4, full: true }], '소지품 추가', false, 6);
    // 관계란: 캐릭터 · 상대 휴대폰 알림 (아이메시지 · 문자 → 메시지 칸 / 부재중 전화 → 표시 시각 · 횟수 칸)
    const isMsg = v => v.msgType === 'imessage' || v.msgType === 'sms', isCall = v => v.msgType === 'missed';
    const getRel = listEditor($('#e-rel', m), d.related, [
      { k: 'id', type: 'select', options: () => [['', '— 캐릭터 선택 —']].concat(others.map(c => [c.id, `${(c.data && c.data.name) || '?'} (@${c.author})`])) },

      { k: 'msgType', type: 'select', full: true, options: () => [['', '📱 상대 휴대폰에 보낼 알림 — 없음'], ['imessage', '💬 아이메시지'], ['sms', '✉️ 문자'], ['missed', '📞 부재중 전화']] },
      { k: 'msg', type: 'textarea', ph: '상대 잠금 화면에 뜰 메시지', rows: 2, full: true, show: isMsg },
      { k: 'time', ph: '표시 시각 (예: 오전 2:14)', row: 'p', max: 12, show: isCall },
      { k: 'missed', ph: '부재중 횟수', row: 'p', max: 2, show: isCall },
      { k: 'pv', type: 'action', label: '📱 미리보기', row: 'a', onClick: v => previewRel(v) }], '관계 추가');
    // 미리보기: 상대 캐릭터의 휴대폰을 열어서, 지금 적는 알림이 잠금 화면에 어떻게 뜨는지 보여 줘요 (저장 전 값 그대로)
    async function previewRel(v) {
      const target = others.find(c => c.id === v.id); if (!target) return toast('먼저 캐릭터를 골라 주세요.', 'err');
      if (!v.msgType) return toast('상대 휴대폰에 보낼 알림을 골라 주세요.', 'err');
      if (!window.Phone) await loadPhone();
      const me = { id: (row && row.id) || 'preview', data: Object.assign({}, d, { name: f.name.value.trim() || '(이름)', head: f.head.value.trim(), images: getImgs().filter(i => safeUrl(i.url)), related: [cleanRel(v)] }) };
      Phone.open(target, others.filter(c => c.id !== me.id).concat([me]), { preview: true });
    }


    const f = $('#cf', m);
    // 키링 미리보기: 종류 · 글자 · 이미지를 바꾸면 바로 그려져요
    const krPrev = () => {
      const box = $('#kr-prev', m); if (!box || !window.Keyring) return;
      const t = (f.querySelector('[name=kr_type]:checked') || {}).value || 'none';
      f.querySelector('.kr-txt').hidden = t !== 'letters'; f.querySelector('.kr-img').hidden = t !== 'acrylic';
      const out = Keyring.html({ type: t, text: f.kr_text.value, img: safeUrl(f.kr_img.value.trim()) });
      box.innerHTML = out ? `<div class="kr">${out.html}</div>` : `<p class="hint-text" style="margin:0;text-align:center">${t === 'none' ? '키링 없음' : t === 'letters' ? '영문 글자를 적어 주세요' : '이미지 링크를 넣어 주세요'}</p>`;
    };
    ['kr_text', 'kr_img'].forEach(n => f[n].addEventListener('input', krPrev));
    f.querySelectorAll('[name=kr_type]').forEach(r => r.addEventListener('change', krPrev));
    krPrev();

    // 성격 서식: 고르는 대로 글 칸에 바로 적용 (보이는 그대로 프로필에 나와요)
    const psNow = () => normPStyle({ font: f.ps_font.value, size: f.ps_size.value, ls: f.ps_ls.value, lh: f.ps_lh.value });
    const psApply = () => { const s = psNow(); f.persona.style.cssText = personaCSS(s); $('[data-psv="ls"]', m).textContent = s.ls.toFixed(1); $('[data-psv="lh"]', m).textContent = s.lh.toFixed(1); };
    ['ps_font', 'ps_size', 'ps_ls', 'ps_lh'].forEach(n => f[n].addEventListener('input', psApply));
    f.head.oninput = () => { $('#hd-th', m).style.backgroundImage = cssUrl(safeUrl(f.head.value.trim())); };
    f.fx_url.oninput = () => { $('#fx-th', m).style.backgroundImage = cssUrl(safeUrl(f.fx_url.value.trim())); };
    f.fx_op.oninput = () => { $('[data-fxv]', m).textContent = Math.round(f.fx_op.value * 100) + '%'; };
    $('[data-cancel]', m).onclick = closeModal;

    f.onsubmit = async e => {
      e.preventDefault();
      const v = n => f[n].value.trim();
      const err = msg => { $('#cerr', m).textContent = msg; };
      if (!v('name')) { $('.etabs [data-t="basic"]', m).click(); return err('이름을 입력해 주세요.'); }
      if (!HOUSES.includes(f.team.value)) { $('.etabs [data-t="basic"]', m).click(); return err('가문을 골라 주세요 (瑞門 / 誓門 / 染).'); }
      const head = f.head.value.trim();
      if (head && !/^https?:\/\//i.test(head)) { $('.etabs [data-t="img"]', m).click(); return err('두상은 https:// 로 시작하는 이미지 링크로 넣어 주세요.'); }
      const stats = statLocked ? pub.stats : STAT_KEYS.map(k => `${k}: ${f['st_' + k].value.trim()}`).join('\n');
      const krT = (f.querySelector('[name=kr_type]:checked') || {}).value;
      if (krT === 'letters' && !v('kr_text').replace(/[^0-9a-z]/gi, '')) { $('.etabs [data-t="basic"]', m).click(); return err('영어 스트랩에 넣을 영문 글자를 적어 주세요.'); }
      if (krT === 'acrylic' && !/^https?:\/\//i.test(v('kr_img'))) { $('.etabs [data-t="basic"]', m).click(); return err('아크릴 키링에 넣을 이미지 링크(https://)를 넣어 주세요.'); }
      const list = s => s.split(/[,，]/).map(x => x.trim()).filter(Boolean).slice(0, 16);
      const data = {
        name: v('name'), name_en: v('name_en'), org: v('org'), team: f.team.value, rank: f.rank.value, quote: v('quote'),
        color: f.color.value, head, tags: [],   // 태그 칸은 없앴어요
        keyring: { type: (f.querySelector('[name=kr_type]:checked') || {}).value || 'none', text: v('kr_text').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10), img: /^https?:\/\//i.test(v('kr_img')) ? v('kr_img') : '' },
        silhouette: false, card: false,
        bgfx: { url: /^https?:\/\//i.test(v('fx_url')) ? v('fx_url') : '', mode: BGFX_MODES[f.fx_mode.value] ? f.fx_mode.value : 'screen', op: Math.max(.1, Math.min(1, +f.fx_op.value || .8)) },
        images: getImgs().filter(i => safeUrl(i.url)).map((i, k) => ({ label: 'V' + (k + 1), url: i.url })),
        song: { title: '', artist: '', url: v('s_url'), cover: '' },
        ability: { name: v('a_name'), sub: '', desc: v('a_desc') },
        danger: v('danger') === '' ? '' : Math.max(0, Math.min(100, +v('danger') || 0)),
        skills: getSkills(), stats,
        persona: f.persona.value.replace(/\s+$/, ''), persona_style: psNow(),
        profile: parseKV(d.profile).filter(([k]) => !BODY_KEYS.some(b => b[0] === k)).concat(BODY_KEYS.map(([k, n]) => [k, v(n)]).filter(([, x]) => x)).map(([k, x]) => `${k}: ${x}`).join('\n'),
        prompts: [],
        items: getItems().map(i => ({ name: i.name, rel: i.rel, img: safeUrl(i.img) ? i.img : '', desc: i.desc })),
        related: getRel().filter(r => r.id).map(cleanRel)
      };
      const act = (e.submitter && e.submitter.dataset.act) || 'save';
      const btns = $$('.modal-foot button', m); btns.forEach(b => b.disabled = true);
      try {
        // 1) 언제나 작성본으로 먼저 저장 (게시본은 그대로)
        const saved = await Store.saveDraft(row && row.id, data);
        const go = u => { closeModal(); location.href = u; };
        if (act === 'preview') return go(`character.html?id=${encodeURIComponent(saved.id)}&preview=1`);
        if (act === 'submit') { await Store.submit(saved.id); toast('제출했어요! 관리자가 확인한 뒤 게시돼요.'); return go('mypage.html#c-' + saved.id); }
        if (act === 'publish') { await Store.publish(saved.id); toast('게시했어요'); return go('character.html?id=' + encodeURIComponent(saved.id)); }
        toast('작성본을 저장했어요'); go(isAdmin ? `character.html?id=${encodeURIComponent(saved.id)}&preview=1` : 'mypage.html#c-' + saved.id);
      } catch (ex) {
        err(ex.message); btns.forEach(b => b.disabled = b.dataset.act === 'submit' && !subPerm.ok);
        // 저장은 됐는데 제출만 막힌 경우: 다시 열 때 그 작성본이 나오도록
        if (act === 'submit' && !row) setTimeout(() => location.href = 'mypage.html', 1800);
      }
    };
  }
};

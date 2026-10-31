/* ================================================================
   Store — 로그인/데이터 저장 계층
   · Supabase 설정이 있으면 Supabase 사용 (진짜 회원가입, 모두가 같은 데이터)
   · 없으면 데모 모드 (localStorage, 이 브라우저에서만 보임)
   테이블: profiles, characters, notes, links, telepathy,
           site_settings(사이트 설정), edit_grants(예외 허용)
   ================================================================ */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const remoteOn = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const newId = () => (crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const now = () => new Date().toISOString();
  const byCreated = (a, b) => String(a.created_at).localeCompare(String(b.created_at));

  const DAILY = 1; // 심박(텔레파시): 한 사람당 하루 무료 횟수 (캐릭터 수와 상관없이 · 다음 날로 쌓이지 않아요) · 더 보내려면 상점의 심박권(k_beat)
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
  /* 출석 · 상점 — 날짜는 한국 시간 기준 'YYYY-MM-DD' */
  const kstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
  // 출석 영전: 연속 출석 1~7일째에 받는 양 · 7일을 채우면 다음 날부터 다시 1일째 (하루라도 빠져도 1일째로)
  const ATTEND = { week: [10, 15, 20, 25, 30, 30, 50] };
  const attendReward = streak => ATTEND.week[(Math.max(1, streak) - 1) % 7];
  /* 상점 물건 (데모용 · Supabase 에서는 shop_items 표가 기준이에요)
     kind: title 칭호 / tag 이름표 색 / snack 간식 / ticket 지정권 / boost 스탯 증가권 / curse 파산권(선물 전용)
     stats: 칭호를 달면 오르는 스탯 (관리자 페이지에서 정해요) · max_per: 한 사람이 받을 수 있는 최대 횟수 */
  const STATS = ['근력', '지력', '이성', '술력', '외모', '재력', '행운'];
  const TITLE_NAMES = ['오빠', '애기', '차기 가주', '천사', '악마', '고양이', '바보', '멍청이', '줴줴이야', '엄..', '초딩', '어른', '섹시한', '귀여운', '멋진', '예쁜', '누나', '망량의 아이돌', '일진', '찐따',
    '밤티', '장원영', '먼작귀', '씹탑', '천상수', '강부치', '천상팸', '남자 친구', '여자 친구', '{from} 남친', '{from} 여친', '{from} 꺼', '개', '건드리지 마세요', 'zzZ'];
  /* 칭호에 {from} 이 있으면 선물로만 받을 수 있고, 그 자리에 선물한 사람 닉네임이 들어가요 (equip.from = { 칭호id: 닉네임 }) */
  const FROM = '{from}', isFromTitle = it => !!it && it.kind === 'title' && String(it.value || '').includes(FROM);
  const titleText = (it, equip) => it ? String(it.value || '').split(FROM).join(((equip && equip.from) || {})[it.id] || '누군가') : '';
  const SHOP = TITLE_NAMES.map((n, i) => ({ id: 't' + String(i + 1).padStart(2, '0'), kind: 'title', name: n.split(FROM).join('(보낸 사람)'), price: 500, value: n,
    descr: n.includes(FROM) ? '선물로만 받을 수 있어요. 선물한 사람의 닉네임이 칭호에 들어가요.' : '', sort: i + 1, active: true, stats: {},
    stock: n.includes(FROM) ? 3 : 1 })).concat([   // 칭호는 한정: 선물 전용은 3명, 나머지는 1명이 가지면 품절
    { id: 'c_moon', kind: 'tag', name: '월백 이름표', price: 400, value: '#f4f3ff', descr: '달빛처럼 하얀 이름표', sort: 61 },
    { id: 'c_lav', kind: 'tag', name: '연보라 이름표', price: 400, value: '#c4b6ff', descr: '고양이 털빛 연보라', sort: 62 },
    { id: 'c_jade', kind: 'tag', name: '청자 이름표', price: 600, value: '#9fe0cf', descr: '매듭 구슬의 옥빛', sort: 63 },
    { id: 'c_plum', kind: 'tag', name: '홍매 이름표', price: 600, value: '#ffa3c8', descr: '볼터치 같은 분홍', sort: 64 },
    { id: 'c_gold', kind: 'tag', name: '금박 이름표', price: 1200, value: '#f0d58a', descr: '금박을 입힌 이름표', sort: 65 },
    { id: 's_churu', kind: 'snack', name: '츄르', price: 200, value: '', descr: '로비 고양이에게 줄 수 있어요 (1개씩 사용)', sort: 71 },
    { id: 'k_room', kind: 'ticket', name: '룸메이트 지정권', price: 300, value: '', descr: '룸메이트를 지정할 수 있는 권리예요. 사용할 땐 관리자에게 알려 주세요.', sort: 81 },
    { id: 'k_beat', kind: 'ticket', name: '심박권', price: 150, value: '', descr: '오늘 무료 심박을 쓴 뒤에도 심박을 한 번 더 보낼 수 있어요. 보내면 1장씩 줄고, 다음 날로 쌓여요.', sort: 80 },
    { id: 'b_stat', kind: 'boost', name: '스탯 증가권', price: 1000, value: '', descr: '캐릭터의 스탯 하나가 무작위로 +5 올라요. 한 사람당 10번까지.', sort: 82, max_per: 10 },
    // 파산권: 영전이 마이너스인 사람에게 선물로만 · 50% 확률로 빚 절반 탕감, 50% 확률로 빚 전부 탕감
    { id: 'x_bankrupt', kind: 'curse', name: '파산권', price: 3000, value: '', descr: '영전이 마이너스인 사람에게만 선물할 수 있어요. 50% 확률로 빚이 반으로 줄거나, 50% 확률로 빚이 다 없어져요.', sort: 83 },
    // needs: 'cat_full' — 로비 고양이 호감도를 가득 채운 사람에게만 상점에 보여요 (본인만 살 수 있어요)
    { id: 't36', kind: 'title', name: '집사', price: 500, value: '집사', descr: '로비 고양이의 호감도를 가득 채운 사람만 살 수 있어요. 선물은 안 돼요.', sort: 36, needs: 'cat_full' },
    // needs: 'cat_gift' — 고양이 호감도 170 에서 받는 칭호 (팔지 않아요 · 받은 사람만 상점에서 달고 빼요)
    { id: 't_cat170', kind: 'title', name: '^. .^₎⟆ ˙⋆✮', price: 0, value: '^. .^₎⟆ ˙⋆✮', descr: '로비 고양이와 아주 친해지면 받는 칭호예요.', sort: 37, stock: 0, needs: 'cat_gift' },
    { id: 't_cat200', kind: 'title', name: '주인님', price: 0, value: '주인님', descr: '로비 고양이의 호감도를 끝까지 채우면 받는 칭호예요.', sort: 38, stock: 0, needs: 'cat_gift' }
  ]).map(i => Object.assign({ active: true, stats: {}, max_per: null, stock: null, needs: null }, i));
  /* 고양이 호감도: 누르면 +1 (하루에 최대 +5 · 날마다 0으로 돌아가지 않고 계속 쌓여요)
     삐지면 -2 (하루 한 번만) · 25 · 50 · 75 에 처음 닿으면 영전 선물 · 100 이면 '집사' 칭호 공개 */
  // luck: 쓰다듬을 때 5% 로 +10 · 또 5% 로 -10 · steps: 단계 선물 (60·150 비밀 내레이션 · 90 이성 +1 · 100 집사 · 170 칭호 · 200 주인님)
  const CAT = { max: 200, full: 100, daily: 5, luck: .05, jump: 10, drop: 2, steps: [60, 90, 100, 150, 170, 200], title: 't_cat170' };
  /* 미니 게임 · 모아팡 (로비 전광판 → pang.html): 하루 한 판 · 영전 50~1000 을 걸고, 난이도는 직접 골라요
     배율은 시작할 때 몰래 뽑아요 (×1.5 70% · ×2 20% · ×4 5% · ×6 3% · ×10 2%)
     이기면 걸은 영전 × 배율을 받고 (걸은 영전 포함), 지면 같은 배율만큼 잃어요 (마이너스가 될 수도 있어요)
     점수는 브라우저가 아니라 규칙 파일(pang-engine.js)로 다시 돌려서 계산해요 — 실제 사이트에선 서버 함수 pang-finish 가 해요
     ⚠ 난이도 표는 supabase-schema.sql 의 pang_level 과 같아야 해요 */
  const PANG_LEVELS = [
    { id: 'normal',  name: '보통',        han: 'LV.1', target: 3700, secs: 60, glass: false },
    { id: 'hard',    name: '매우 어려움', han: 'LV.2', target: 4000, secs: 45, glass: false },
    { id: 'hell',    name: '지옥',        han: 'LV.3', target: 4000, secs: 30, glass: true },
    { id: 'extreme', name: '극악',        han: 'LV.4', target: 4400, secs: 25, glass: true }
  ];
  const pangLevel = id => PANG_LEVELS.find(l => l.id === id) || PANG_LEVELS[0];
  const PANG = { min: 50, max: 1000, ext: 30, grace: 300 };   // ext: 모래시계로 늘릴 수 있는 최대 시간(초)
  const PANG_MULT = [[1.5, 70], [2, 20], [4, 5], [6, 3], [10, 2]];
  const rollMult = t => { let r = Math.random() * 100; for (const [m, p] of t) if ((r -= p) < 0) return m; return t[0][0]; };
  /* stock: 최대 몇 명이 가질 수 있는지 (비우거나 0이면 무제한) · sold: 지금 가진 사람 수 */
  const soldOut = it => !!(it && it.stock && (it.sold || 0) >= it.stock);
  const LOG_DAYS = 3; // 상점 기록은 3일 지나면 지워져요
  /* 데모: 관리자가 저장한 상점 목록 + 나중에 새로 생긴 물건 */
  const shopList = () => { const s = LS.get('t:shop', null); if (!s) return SHOP; const ids = new Set(s.map(i => i.id));
    return s.map(i => 'stock' in i ? i : Object.assign({ stock: (SHOP.find(x => x.id === i.id) || {}).stock || null }, i)).concat(SHOP.filter(i => !ids.has(i.id))); };
  const soldCount = id => Object.values(LS.get('t:wallets', {})).filter(w => (w.items || []).includes(id)).length;
  const streakOf = (days, today = kstDay()) => { // 오늘(또는 어제)까지 이어진 연속 출석 일수
    const set = new Set(days); let d = new Date(today + 'T00:00:00Z'), n = 0;
    if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
    return n;
  };
  const emptyWallet = () => ({ coins: 0, items: [], equip: {}, snacks: 0, tickets: {}, boosts: {}, boost_n: 0, aff: 0, aff_day: null, aff_gain: 0, aff_drop: null, aff_gifts: [], cat_full: false, cat_secrets: [] });
  const affToday = w => w.aff_day === kstDay() ? (w.aff_gain || 0) : 0;   // 오늘 올린 호감도
  const maskTele = (m, me) => m.owner_id !== me
    ? Object.assign({}, m, { owner_id: null, author: null, from_char: null }) : m;
  const PROFILE_KEYS = ['nickname', 'title', 'bio', 'seal', 'role'];
  const profileOf = u => ({
    id: u.id, nickname: u.nickname, title: u.title || '', bio: u.bio || '', seal: u.seal || '',
    role: u.role || '', grade: u.grade || 'member', approval: u.approval || 'approved',
    username: u.username || '', email: u.contact || '', created_at: u.created_at
  });

  /* ---------- 아이디 · 비밀번호 규칙 ---------- */
  const ID_RE = /^[a-z0-9_]{4,8}$/;
  const RESERVED = ['admin', 'root', 'master', 'manager', 'system', 'support', 'test'];
  const checkId = id => {
    id = String(id || '').trim().toLowerCase();
    if (!ID_RE.test(id)) throw new Error('아이디는 영문 소문자·숫자·_ 로 4~8자예요.');
    if (RESERVED.includes(id)) throw new Error('사용할 수 없는 아이디예요.');
    return id;
  };
  const checkPw = pw => {
    pw = String(pw || '');
    if (pw.length < 6 || pw.length > 8) throw new Error('비밀번호는 6~8자예요.');
    return pw;
  };
  // Supabase 는 로그인에 이메일 모양이 필요해서, 아이디를 속으로 이메일 모양으로 바꿔요 (회원에겐 안 보여요)
  const idEmail = id => `${id}@${cfg.idEmailDomain || 'member.hongbu.site'}`;

  /* 사이트 설정 기본값 */
  const DEFAULT_SETTINGS = {
    bgm_url: '', bgm_title: '', bgm_on: false,
    signup_open: true, public_view: false,   // public_view: 비회원도 사이트를 둘러볼 수 있게
    create_mode: 'open', create_start: '', create_end: '',   // open | closed | scheduled
    edit_mode: 'closed', edit_start: '', edit_end: '',
    lobby_banners: []   // 메인 왼쪽 아래 배너 [{ tag, title, text, link, c1, c2, angle, ghost }]
  };

  /* ---------------- 데모(로컬) 백엔드 ---------------- */
  const LS = {
    get(k, d) {
      try { const v = localStorage.getItem('naru:' + k); return v ? JSON.parse(v) : d; }
      catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('naru:' + k, JSON.stringify(v)); }
      catch (e) { throw new Error('브라우저 저장 공간이 부족해요. 이미지 크기를 줄여 주세요.'); }
    },
    del(k) { try { localStorage.removeItem('naru:' + k); } catch (e) {} }
  };
  async function hash(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  // 예전 데모 데이터 정리
  (function migrate() {
    const users = LS.get('users', []);
    // 관리자가 없으면 가장 먼저 가입한 사람을 관리자로
    if (users.length && !users.some(u => u.grade === 'admin')) {
      users.sort(byCreated)[0].grade = 'admin'; LS.set('users', users);
    }
    // 상태가 없는 예전 캐릭터는 "게시됨"으로
    const cs = LS.get('t:characters', []);
    if (cs.some(c => !c.status)) {
      cs.forEach(c => { if (!c.status) { c.status = 'published'; c.published_at = c.published_at || c.created_at; c.draft = null; } });
      LS.set('t:characters', cs);
    }
  })();
  // 예전 데모 계정(이메일 로그인)에 아이디 붙이기
  (function migrateIds() {
    const users = LS.get('users', []);
    if (!users.some(u => !u.username)) return;
    const taken = new Set(users.map(u => u.username).filter(Boolean));
    users.forEach((u, i) => {
      if (u.username) return;
      let base = String(u.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8);
      if (base.length < 4) base = 'user' + String(i + 1).padStart(2, '0');
      let id = base, k = 1; while (taken.has(id)) id = base.slice(0, 6) + String(k++).padStart(2, '0');
      taken.add(id); u.username = id; u.contact = u.contact || u.email || ''; u.approval = u.approval || 'approved';
    });
    LS.set('users', users);
  })();
  const pub = u => ({ id: u.id, username: u.username, nickname: u.nickname, grade: u.grade || 'member', approval: u.approval || 'approved' });

  const local = {
    async user() {
      const sid = LS.get('session', null);
      const u = sid && LS.get('users', []).find(x => x.id === sid);
      return u && (u.approval || 'approved') === 'approved' ? pub(u) : null;
    },
    async usernameAvailable(id) { return !LS.get('users', []).some(u => u.username === id); },
    async signUp(id, pw, nickname, contact) {
      if (LS.get('settings', DEFAULT_SETTINGS).signup_open === false) throw new Error('지금은 회원가입을 받지 않고 있어요.');
      const users = LS.get('users', []);
      if (users.some(u => u.username === id)) throw new Error('이미 있는 아이디예요.');
      if (users.some(u => u.nickname === nickname)) throw new Error('이미 사용 중인 닉네임이에요.');
      const first = !users.length; // 맨 처음 가입자는 관리자로 바로 승인
      const u = { id: newId(), username: id, contact: String(contact || '').slice(0, 120), nickname, grade: first ? 'admin' : 'member',
        approval: first ? 'approved' : 'pending', pw: await hash(id + ':' + pw), created_at: now() };
      users.push(u); LS.set('users', users);
      if (first) { LS.set('session', u.id); return { user: pub(u) }; }
      return { pending: true };
    },
    async signIn(id, pw) {
      const h = await hash(id + ':' + pw);
      const u = LS.get('users', []).find(x => x.username === id && x.pw === h);
      if (!u) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
      if ((u.approval || 'approved') === 'pending') throw new Error('가입 승인을 기다리는 중이에요. 관리자가 승인하면 입장할 수 있어요.');
      if (u.approval === 'rejected') throw new Error('가입이 승인되지 않았어요. 관리자에게 문의해 주세요.');
      LS.set('session', u.id);
      return { user: pub(u) };
    },
    async setApproval(id, approval) {
      const users = LS.get('users', []); const u = users.find(x => x.id === id);
      if (!u) throw new Error('회원을 찾을 수 없어요.');
      u.approval = approval; LS.set('users', users);
    },
    async signOut() { LS.del('session'); },
    async profiles() { return LS.get('users', []).map(profileOf).sort(byCreated); },
    async updateProfile(id, patch) {
      const users = LS.get('users', []);
      const u = users.find(x => x.id === id);
      if (!u) throw new Error('회원을 찾을 수 없어요.');
      if (patch.nickname && users.some(x => x !== u && x.nickname === patch.nickname)) throw new Error('이미 사용 중인 닉네임이에요.');
      PROFILE_KEYS.forEach(k => { if (k in patch) u[k] = patch[k]; });
      LS.set('users', users); return profileOf(u);
    },
    /* 사이트 설정 · 예외 · 기록 */
    async settings() { return Object.assign({}, DEFAULT_SETTINGS, LS.get('settings', {})); },
    async saveSettings(patch) { const s = Object.assign(await this.settings(), patch); LS.set('settings', s); return s; },
    async grants() { return LS.get('t:grants', []).sort(byCreated); },
    async addGrant(g) { const all = LS.get('t:grants', []); const r = Object.assign({ id: newId(), created_at: now() }, g); all.push(r); LS.set('t:grants', all); return r; },
    async removeGrant(id) { LS.set('t:grants', LS.get('t:grants', []).filter(g => g.id !== id)); },
    /* 관리자 전용 회원 관리 */
    async setGrade(id, grade) {
      const users = LS.get('users', []); const u = users.find(x => x.id === id);
      if (!u) throw new Error('회원을 찾을 수 없어요.');
      if (grade !== 'admin' && u.grade === 'admin' && users.filter(x => x.grade === 'admin').length < 2) throw new Error('관리자가 최소 한 명은 있어야 해요.');
      u.grade = grade; LS.set('users', users);
    },
    async setPassword(id, pw) {
      const users = LS.get('users', []); const u = users.find(x => x.id === id);
      if (!u) throw new Error('회원을 찾을 수 없어요.');
      u.pw = await hash(u.username + ':' + pw); LS.set('users', users);
    },
    async deleteUser(id) {
      const users = LS.get('users', []); const u = users.find(x => x.id === id);
      if (!u) return;
      if (u.grade === 'admin' && users.filter(x => x.grade === 'admin').length < 2) throw new Error('마지막 관리자는 탈퇴시킬 수 없어요.');
      LS.set('users', users.filter(x => x.id !== id));
      const chars = LS.get('t:characters', []).filter(c => c.owner_id === id);
      for (const c of chars) await this.remove('characters', c.id);
      const goneNotes = new Set(LS.get('t:notes', []).filter(n => n.owner_id === id).map(n => n.id));
      ['notes', 'links', 'npcs'].forEach(t => LS.set('t:' + t, LS.get('t:' + t, []).filter(r => r.owner_id !== id)));
      LS.set('t:links', LS.get('t:links', []).filter(l => !goneNotes.has(l.from_id) && !goneNotes.has(l.to_id)));   // 지워진 쪽지에 이어진 남의 실도
      // 지갑 · 출석 · 모아팡 판 기록도 같이 (서버의 on delete cascade 와 같아요)
      const ws = LS.get('t:wallets', {}); delete ws[id]; LS.set('t:wallets', ws);
      LS.set('t:attendance', LS.get('t:attendance', []).filter(a => a.user_id !== id));
      LS.set('t:pang', LS.get('t:pang', []).filter(p => p.user_id !== id));
      LS.set('t:teles', LS.get('t:teles', []).filter(m => m.owner_id !== id && m.to_user !== id));
      LS.set('t:grants', LS.get('t:grants', []).filter(g => g.user_id !== id));
      if (LS.get('session') === id) LS.del('session');
    },
    /* 텔레파시 */
    async teles(me) {
      return LS.get('t:teles', []).filter(m => m.owner_id === me || m.to_user === me).sort(byCreated).map(m => maskTele(m, me));
    },
    async sendTele(me, nick, p) {
      const all = LS.get('t:teles', []), since = dayStart();
      const body = String(p.body || '').trim().slice(0, 200);
      if (!body) throw new Error('전할 마음을 적어 주세요.');
      const chars = LS.get('t:characters', []);
      const from = chars.find(c => c.id === p.from_char), target = chars.find(c => c.id === p.to_char);
      if (!from || from.owner_id !== me) throw new Error('내 캐릭터만 텔레파시를 보낼 수 있어요.');
      if (!target) throw new Error('받을 캐릭터를 골라 주세요.');
      if (target.owner_id === me) throw new Error('다른 멤버의 캐릭터에게만 보낼 수 있어요.');
      // 캐릭터가 여러 명이어도 한 사람당 하루 1번 무료 · 그다음부터는 심박권 1장씩
      let ws = null;
      if (all.filter(m => m.owner_id === me && m.created_at >= since).length >= DAILY) {
        ws = LS.get('t:wallets', {}); const w = Object.assign(emptyWallet(), ws[me] || {}), t = Object.assign({}, w.tickets);
        if (!(t.k_beat > 0)) throw new Error('오늘 무료 심박을 이미 보냈어요. 상점에서 심박권을 사면 더 보낼 수 있어요.');
        t.k_beat -= 1; w.tickets = t; ws[me] = w;
      }
      const m = { id: newId(), owner_id: me, author: nick, to_user: target.owner_id,
        from_char: from.id, to_char: target.id, body, read: false, created_at: now() };
      all.push(m); LS.set('t:teles', all); if (ws) LS.set('t:wallets', ws); return m;
    },
    async markTeleRead(me, id) {
      const all = LS.get('t:teles', []); const m = all.find(x => x.id === id && x.to_user === me);
      if (m) { m.read = true; LS.set('t:teles', all); }
    },    /* 출석 · 지갑 · 상점 */
    async wallet(me) { return Object.assign(emptyWallet(), LS.get('t:wallets', {})[me] || {}); },
    async attendance(from, uid) { return LS.get('t:attendance', []).filter(r => (!from || r.day >= from) && (!uid || r.user_id === uid)).sort(byCreated); },
    async checkIn(me, nick, comment) {
      const all = LS.get('t:attendance', []), today = kstDay();
      if (all.some(r => r.user_id === me && r.day === today)) throw new Error('오늘은 이미 출석했어요.');
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[me] || {});
      const list = shopList(), tag = w.equip.tag ? (list.find(i => i.id === w.equip.tag) || {}).value : null, title = w.equip.title ? titleText(list.find(i => i.id === w.equip.title), w.equip) : null;
      all.push({ id: newId(), user_id: me, day: today, nick, title: title || null, tag: tag || null, comment: String(comment || '').trim().slice(0, 60), created_at: now() });
      const streak = streakOf(all.filter(r => r.user_id === me).map(r => r.day), today);
      const gained = attendReward(streak);
      w.coins += gained; ws[me] = w;
      LS.set('t:attendance', all); LS.set('t:wallets', ws);
      return { gained, day: (streak - 1) % 7 + 1, streak, coins: w.coins };
    },
    async shopItems(all) { const it = shopList(); return it.filter(i => all || i.active !== false).map(i => Object.assign({}, i, { sold: soldCount(i.id) })).sort((a, b) => (a.sort || 0) - (b.sort || 0)); },
    async saveShopItem(item) {
      const list = (shopList()).slice(), i = list.findIndex(x => x.id === item.id);
      if (i < 0) throw new Error('없는 물건이에요.');
      list[i] = Object.assign({}, list[i], item); LS.set('t:shop', list); return list[i];
    },
    async buy(me, nick, id, opt = {}) {
      const it = (shopList()).find(i => i.id === id && i.active !== false); if (!it) throw new Error('없는 물건이에요.');
      const to = opt.to || me, gift = to !== me;
      const users = LS.get('users', []), tu = users.find(u => u.id === to);
      if (!tu || (tu.approval || 'approved') !== 'approved') throw new Error('받을 사람을 찾을 수 없어요.');
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[me] || {}); ws[me] = w;
      const r = to === me ? w : Object.assign(emptyWallet(), ws[to] || {}); ws[to] = r;
      const who = gift ? '받는 사람이' : '';
      let detail = '';
      if ((it.kind === 'title' || it.kind === 'tag') && r.items.includes(id)) throw new Error(`${who} 이미 가지고 있어요.`.trim());
      if (isFromTitle(it) && !gift) throw new Error('이 칭호는 선물로만 받을 수 있어요.');
      if (it.kind === 'curse' && !gift) throw new Error('파산권은 선물로만 보낼 수 있어요.');
      if (it.kind === 'curse' && !(r.coins < 0)) throw new Error('파산권은 영전이 마이너스인 사람에게만 보낼 수 있어요.');
      if (it.needs === 'cat_gift') throw new Error('고양이에게 받는 칭호예요.');
      if (it.needs === 'cat_full' && gift) throw new Error('이 칭호는 선물할 수 없어요.');
      if (it.needs === 'cat_full' && !r.cat_full) throw new Error('고양이 호감도를 가득 채워야 살 수 있어요.');
      if (soldOut(Object.assign({}, it, { sold: soldCount(id) }))) throw new Error('품절됐어요.');
      if (it.kind === 'boost') {
        const ch = LS.get('t:characters', []).find(c => c.id === opt.char && c.owner_id === to);
        if (!ch) throw new Error('스탯을 올릴 캐릭터를 골라 주세요.');
        if (it.max_per && r.boost_n >= it.max_per) throw new Error(`${gift ? '이 사람은' : '이미'} 스탯 증가권을 ${it.max_per}번 다 받았어요.`);
        opt.charName = (ch.data && ch.data.name) || '?';
      }
      if (w.coins < it.price) throw new Error('영전이 모자라요.');
      w.coins -= it.price;
      if (it.kind === 'title' || it.kind === 'tag') { r.items.push(id); r.equip = Object.assign({}, r.equip, { [it.kind]: id });   // 사면(받으면) 바로 달아요
        if (isFromTitle(it)) r.equip.from = Object.assign({}, r.equip.from, { [id]: nick }); }
      else if (it.kind === 'snack') r.snacks += 1;
      else if (it.kind === 'ticket') r.tickets = Object.assign({}, r.tickets, { [id]: (r.tickets[id] || 0) + 1 });
      else if (it.kind === 'boost') {
        const st = STATS[Math.floor(Math.random() * STATS.length)], b = Object.assign({}, r.boosts[opt.char] || {});
        b[st] = (b[st] || 0) + 5; r.boosts = Object.assign({}, r.boosts, { [opt.char]: b }); r.boost_n += 1;
        detail = `${opt.charName} · ${st} +5`;
      }
      else if (it.kind === 'curse') {   // 빚이 반으로 줄거나 (예: -100 → -50) · 다 없어지거나 (-100 → 0)
        if (Math.random() < .5) { const cut = Math.floor(-r.coins / 2); r.coins += cut; detail = `빚 절반 탕감 (+${cut})`; }
        else { r.coins = 0; detail = '빚 탕감 · 0'; }
      }
      LS.set('t:wallets', ws);
      const cut = new Date(Date.now() - LOG_DAYS * 864e5).toISOString();
      const log = LS.get('t:shoplog', []).filter(l => l.created_at >= cut);
      log.push({ id: newId(), kind: gift ? 'gift' : 'buy', buyer: me, buyer_nick: nick, to_user: to, to_nick: tu.nickname, item_id: id, item_name: it.name, price: it.price, detail, created_at: now() });
      LS.set('t:shoplog', log);
      return { wallet: w, detail };
    },
    async badges() {
      const ws = LS.get('t:wallets', {}), out = {};
      for (const uid in ws) out[uid] = { equip: ws[uid].equip || {}, boosts: ws[uid].boosts || {}, coins: ws[uid].coins || 0 };
      return out;
    },
    async shopLog() { const cut = new Date(Date.now() - LOG_DAYS * 864e5).toISOString(); return LS.get('t:shoplog', []).filter(l => l.created_at >= cut).reverse(); },
    async adminWallets() { const ws = LS.get('t:wallets', {}), out = {}; for (const k in ws) out[k] = Object.assign(emptyWallet(), ws[k]); return out; },
    async giveCoins(me, nick, to, amount, note) {
      const n = parseInt(amount, 10); if (!n) throw new Error('지급할 영전을 적어 주세요.');
      const users = LS.get('users', []), tu = users.find(u => u.id === to); if (!tu) throw new Error('회원을 찾을 수 없어요.');
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[to] || {});
      w.coins = n > 0 ? w.coins + n : Math.min(w.coins, Math.max(0, w.coins + n)); ws[to] = w; LS.set('t:wallets', ws);   // 빚이 있어도 지급은 그대로 더해요 · 회수는 0 아래로 안 내려가요
      const cut = new Date(Date.now() - LOG_DAYS * 864e5).toISOString();
      const log = LS.get('t:shoplog', []).filter(l => l.created_at >= cut);
      log.push({ id: newId(), kind: 'admin', buyer: me, buyer_nick: nick, to_user: to, to_nick: tu.nickname, item_id: 'coins', item_name: n > 0 ? '영전 지급' : '영전 회수', price: n, detail: String(note || '').slice(0, 60), created_at: now() });
      LS.set('t:shoplog', log);
      return w;
    },
    async equip(me, kind, id) {
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[me] || {});
      if (id && !w.items.includes(id)) throw new Error('가지고 있지 않은 물건이에요.');
      w.equip = Object.assign({}, w.equip, { [kind]: id || null }); ws[me] = w; LS.set('t:wallets', ws); return w;
    },
    async useSnack(me) {
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[me] || {});
      if (w.snacks < 1) throw new Error('츄르가 없어요. 상점에서 살 수 있어요.');
      w.snacks -= 1; ws[me] = w; LS.set('t:wallets', ws); return w;
    },
    async catPet(me, up) {
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[me] || {}), today = kstDay();
      let gift = 0, unlocked = false, changed = 0, bonus = 0; const rewards = [];
      if (up) {
        const gain = affToday(w);
        if (gain < CAT.daily && w.aff < CAT.max) {
          const roll = Math.random();
          changed = roll < CAT.luck ? Math.min(CAT.jump, CAT.max - w.aff) : roll < CAT.luck * 2 ? -Math.min(CAT.jump, w.aff) : 1;
          bonus = roll < CAT.luck * 2 ? (roll < CAT.luck ? 1 : -1) : 0;
          w.aff += changed; w.aff_day = today; w.aff_gain = gain + 1;
          // 비밀 내레이션: 데모에선 localStorage 'naru:cat_secrets' (문장 배열) · 실제 사이트에선 Supabase cat_secrets 표
          const secrets = LS.get('cat_secrets', []), heard = w.cat_secrets || [];
          CAT.steps.forEach(m => {
            if (w.aff < m || w.aff_gifts.includes(m)) return;
            if (m === 60 || m === 150) {
              const left = secrets.map((t, i) => i).filter(i => secrets[i] && !heard.includes(i)); if (!left.length) return;
              const i = left[Math.floor(Math.random() * left.length)]; heard.push(i); w.cat_secrets = heard;
              rewards.push({ th: m, kind: 'lore', text: secrets[i] });
            }
            else if (m === 90) {
              const c = LS.get('t:characters', []).filter(x => x.owner_id === me && x.published_at).sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)))[0];
              if (!c) return;
              const b = Object.assign({}, w.boosts[c.id] || {}); b['이성'] = (b['이성'] || 0) + 1; w.boosts = Object.assign({}, w.boosts, { [c.id]: b });
              rewards.push({ th: m, kind: 'stat' });
            }
            else if (m === CAT.full) { if (!w.cat_full) { w.cat_full = true; unlocked = true; } }
            else if (m === 170) { if (!w.items.includes(CAT.title)) w.items = w.items.concat(CAT.title); rewards.push({ th: m, kind: 'title' }); }
            else if (m === 200) { if (!w.items.includes('t_cat200')) w.items = w.items.concat('t_cat200'); rewards.push({ th: m, kind: 'master' }); }
            w.aff_gifts = w.aff_gifts.concat(m);
          });
        }
      } else if (w.aff_drop !== today && w.aff > 0) { changed = -Math.min(CAT.drop, w.aff); w.aff += changed; w.aff_drop = today; }
      ws[me] = w; LS.set('t:wallets', ws);
      return { wallet: w, gift, unlocked, changed, bonus, rewards };
    },
    /* 미니 게임 (데모) — 실제 사이트의 서버 함수와 같은 방식으로 움직인 기록을 다시 돌려서 점수를 계산해요 */
    pangSettle(rows, r, score) {
      const ws = LS.get('t:wallets', {}), w = Object.assign(emptyWallet(), ws[r.user_id] || {});
      const win = score >= r.target, mult = r.roll;
      const delta = win ? Math.floor(r.bet * mult) - r.bet : -Math.floor(r.bet * mult);   // 걸은 영전 포함 · 지면 마이너스까지
      w.coins += delta; ws[r.user_id] = w; LS.set('t:wallets', ws);
      Object.assign(r, { done: true, score, win, mult, delta }); LS.set('t:pang', rows);
      return { win, mult, delta, coins: w.coins, score, target: r.target };
    },
    async pangStatus(me) {
      const rows = LS.get('t:pang', []);
      rows.filter(x => x.user_id === me && !x.done && Date.now() - Date.parse(x.started_at) > ((x.secs || 60) + PANG.ext + PANG.grace) * 1000)
        .forEach(x => this.pangSettle(rows, x, 0));   // 도중에 나감 → 패배
      const r = rows.find(x => x.user_id === me && x.day === kstDay());
      if (!r) return { played: false };
      return { played: true, done: !!r.done, win: r.win, mult: r.mult, delta: r.delta, bet: r.bet, score: r.score, target: r.target, level: r.level, started_at: r.started_at };
    },
    async pangStart(me, bet, level) {
      bet = parseInt(bet, 10);
      if (!(bet >= PANG.min && bet <= PANG.max)) throw new Error(`영전은 ${PANG.min} ~ ${PANG.max} 사이로 걸 수 있어요.`);
      if (!PANG_LEVELS.some(l => l.id === level)) throw new Error('난이도를 골라 주세요.');
      const rows = LS.get('t:pang', []), today = kstDay();
      if (rows.some(x => x.user_id === me && x.day === today)) throw new Error('오늘은 이미 한 판 했어요. 내일 다시 와요.');
      const w = Object.assign(emptyWallet(), LS.get('t:wallets', {})[me] || {});
      if (w.coins < bet) throw new Error('영전이 모자라요.');
      const t = pangLevel(level), seed = Math.floor(Math.random() * 2147483647);
      rows.push({ id: newId(), user_id: me, day: today, bet, level, target: t.target, secs: t.secs, glass: t.glass, seed, roll: rollMult(PANG_MULT), started_at: now(), done: false });
      LS.set('t:pang', rows.filter(x => x.day >= today || !x.done));   // 판 기록은 하루만 (정산 끝난 어제 판은 지워요)
      return { secs: t.secs, target: t.target, glass: t.glass, seed };
    },
    async pangFinish(me, moves) {
      const rows = LS.get('t:pang', []), r = rows.filter(x => x.user_id === me && !x.done).pop();   // 자정을 넘겨 끝나도 그 판으로
      if (!r) throw new Error('정산할 게임이 없어요.');
      const ms = Date.now() - Date.parse(r.started_at);
      if (ms < ((r.secs || 60) - 5) * 1000) throw new Error('아직 게임 시간이 끝나지 않았어요.');
      let score = 0;
      if (ms <= ((r.secs || 60) + PANG.ext + PANG.grace) * 1000 && window.PangEngine) {
        const rp = PangEngine.replay({ seed: r.seed, secs: r.secs, glass: !!r.glass }, moves);
        if (rp.ok && rp.last <= ms + 3000) score = rp.score;
      }
      return this.pangSettle(rows, r, score);
    },
    /* 일반 표 */
    async list(t) { return LS.get('t:' + t, []).sort(byCreated); },
    async charNames() { return (await this.list('characters')).map(c => ({ id: c.id, owner_id: c.owner_id, author: c.author, published_at: c.published_at, data: { name: (c.data || {}).name || ((c.draft || {}).name) || '', color: (c.data || {}).color || ((c.draft || {}).color) || '' } })); },
    async get(t, id) { return LS.get('t:' + t, []).find(r => r.id === id) || null; },
    async insert(t, row) {
      const rows = LS.get('t:' + t, []);
      const r = Object.assign({ id: newId(), created_at: now() }, row);
      rows.push(r); LS.set('t:' + t, rows); return r;
    },
    async update(t, id, patch) {
      const rows = LS.get('t:' + t, []);
      const r = rows.find(x => x.id === id);
      if (!r) throw new Error('찾을 수 없는 항목이에요.');
      Object.assign(r, patch); LS.set('t:' + t, rows); return r;
    },
    async remove(t, id) {
      LS.set('t:' + t, LS.get('t:' + t, []).filter(r => r.id !== id));
      // Supabase 의 on delete cascade / set null 흉내
      if (t === 'notes') LS.set('t:links', LS.get('t:links', []).filter(l => l.from_id !== id && l.to_id !== id));
      if (t === 'characters') {
        const notes = LS.get('t:notes', []);
        notes.forEach(n => { if (n.character_id === id) n.character_id = null; });
        LS.set('t:notes', notes);
        // 다른 캐릭터의 연관 캐릭터 · 소지품의 선물한 캐릭터 · 지갑의 스탯 증가 기록도 정리 (서버의 cleanup_character 와 같아요)
        const strip = d => d && Object.assign({}, d, { related: (d.related || []).filter(r => r.id !== id), items: (d.items || []).map(i => i.rel === id ? Object.assign({}, i, { rel: '' }) : i) });
        LS.set('t:characters', LS.get('t:characters', []).map(c => Object.assign({}, c, { data: strip(c.data), draft: c.draft ? strip(c.draft) : c.draft })));
        const npcs = LS.get('t:npcs', []); npcs.forEach(n => { if (n.related_char === id) n.related_char = null; }); LS.set('t:npcs', npcs);
        const ws = LS.get('t:wallets', {}); Object.values(ws).forEach(w => { if (w.boosts) delete w.boosts[id]; }); LS.set('t:wallets', ws);
      }
    }
  };

  /* ---------------- Supabase 백엔드 ---------------- */
  let remote = null;
  if (remoteOn) {
    // 주소 뒤에 /rest/v1/ 같은 게 붙어 있어도 프로젝트 주소(https://xxxx.supabase.co)만 써요 (붙어 있으면 "Invalid path" 오류가 나요)
    const sbUrl = String(cfg.supabaseUrl).trim().replace(/\/(rest|auth|storage|functions)\/v1.*$/i, '').replace(/\/+$/, '');
    const sb = window.supabase.createClient(sbUrl, String(cfg.supabaseAnonKey).trim());
    const ok = ({ data, error }) => { if (error) throw new Error(koError(error.message)); return data; };
    const toUser = async u => {
      if (!u) return null;
      let grade = 'member', approval = 'pending', nickname = (u.user_metadata && u.user_metadata.nickname) || u.email.split('@')[0];
      try {
        const { data } = await sb.from('profiles').select('nickname,grade,approval').eq('id', u.id).maybeSingle();
        if (data) { grade = data.grade || 'member'; approval = data.approval || 'pending'; nickname = data.nickname || nickname; }
      } catch (e) {}
      return { id: u.id, username: u.email.split('@')[0], nickname, grade, approval };
    };
    // 관리자 전용: 비밀번호 변경·탈퇴는 Supabase Edge Function(admin-users) 이 처리해요
    const adminFn = async body => {
      const { data, error } = await sb.functions.invoke('admin-users', { body });
      if (error) throw new Error('관리자 기능 서버(admin-users)를 확인해 주세요: ' + error.message);
      if (data && data.error) throw new Error(data.error);
      return data;
    };
    remote = {
      client: sb,
      async user() {
        const { data } = await sb.auth.getSession();
        const u = await toUser(data.session && data.session.user);
        return u && u.approval === 'approved' ? u : null;
      },
      async usernameAvailable(id) { return ok(await sb.rpc('username_available', { p_username: id })); },
      async signUp(id, pw, nickname, contact) {
        ok(await sb.auth.signUp({ email: idEmail(id), password: pw, options: { data: { nickname, username: id, contact: String(contact || '').slice(0, 120) } } }));
        // 승인 전에는 입장할 수 없으니 바로 로그아웃 (첫 관리자는 SQL 로 승인)
        await sb.auth.signOut();
        return { pending: true };
      },
      async signIn(id, pw) {
        const data = ok(await sb.auth.signInWithPassword({ email: idEmail(id), password: pw }));
        const u = await toUser(data.user);
        if (u.approval !== 'approved') {
          await sb.auth.signOut();
          throw new Error(u.approval === 'rejected' ? '가입이 승인되지 않았어요. 관리자에게 문의해 주세요.' : '가입 승인을 기다리는 중이에요. 관리자가 승인하면 입장할 수 있어요.');
        }
        return { user: u };
      },
      async signOut() { await sb.auth.signOut(); },
      async profiles() {
        const rows = ok(await sb.from('profiles').select('*').order('created_at', { ascending: true }));
        // 관리자에게만 읽히는 아이디·이메일 붙이기
        const { data: acc } = await sb.from('accounts').select('id,username,contact');
        if (acc) rows.forEach(r => { const a = acc.find(x => x.id === r.id); if (a) { r.username = a.username; r.email = a.contact; } });
        return rows;
      },
      async setApproval(id, approval) { ok(await sb.from('profiles').update({ approval }).eq('id', id)); },
      async updateProfile(id, patch) {
        const clean = {}; PROFILE_KEYS.forEach(k => { if (k in patch) clean[k] = patch[k]; });
        const row = ok(await sb.from('profiles').update(clean).eq('id', id).select().single());
        const { data } = await sb.auth.getSession();
        if (clean.nickname && data.session && data.session.user.id === id) await sb.auth.updateUser({ data: { nickname: clean.nickname } });
        return row;
      },
      async settings() { const r = ok(await sb.from('site_settings').select('*').eq('id', 1).maybeSingle()); return Object.assign({}, DEFAULT_SETTINGS, r || {}); },
      async saveSettings(patch) { return ok(await sb.from('site_settings').update(patch).eq('id', 1).select().single()); },
      async grants() { return ok(await sb.from('edit_grants').select('*').order('created_at', { ascending: true })); },
      async addGrant(g) { return ok(await sb.from('edit_grants').insert(g).select().single()); },
      async removeGrant(id) { ok(await sb.from('edit_grants').delete().eq('id', id)); },
      async setGrade(id, grade) { ok(await sb.from('profiles').update({ grade }).eq('id', id)); },
      async setPassword(id, pw) { return adminFn({ action: 'set_password', user_id: id, password: pw }); },
      async deleteUser(id) { return adminFn({ action: 'delete_user', user_id: id }); },
      async teles() { return ok(await sb.from('tele_box').select('*').order('created_at', { ascending: true })); },
      async sendTele(me, nick, p) {
        return ok(await sb.rpc('send_tele', { p_from_char: p.from_char, p_to_char: p.to_char, p_body: p.body }));
      },
      async markTeleRead(me, id) { ok(await sb.rpc('mark_tele_read', { p_id: id })); },
      async wallet(me) {
        const r = ok(await sb.from('wallets').select('*').eq('user_id', me).maybeSingle());
        return r ? Object.assign(emptyWallet(), r, { items: r.items || [], equip: r.equip || {}, tickets: r.tickets || {}, boosts: r.boosts || {} }) : emptyWallet();
      },
      async attendance(from, uid) {
        let q = sb.from('attendance').select('*').order('created_at', { ascending: true });
        if (from) q = q.gte('day', from);
        if (uid) q = q.eq('user_id', uid);
        return ok(await q);
      },
      async checkIn(me, nick, comment) { return ok(await sb.rpc('check_in', { p_comment: String(comment || '').slice(0, 60) })); },
      async shopItems(all) {
        let q = sb.from('shop_items').select('*').order('sort', { ascending: true });
        if (!all) q = q.eq('active', true);
        const [rows, sold] = await Promise.all([q.then(ok), sb.from('shop_sold').select('*').then(ok).catch(() => [])]);
        const n = {}; sold.forEach(s => n[s.id] = s.sold);
        return rows.map(r => Object.assign({}, r, { sold: n[r.id] || 0 }));
      },
      async saveShopItem(item) { const { id, ...patch } = item; return ok(await sb.from('shop_items').update(patch).eq('id', id).select().single()); },
      async buy(me, nick, id, opt = {}) {
        const r = ok(await sb.rpc('buy_item', { p_id: id, p_to: opt.to || null, p_char: opt.char || null }));
        return { wallet: Object.assign(emptyWallet(), r.wallet || {}), detail: r.detail || '' };
      },
      async badges() {
        const rows = ok(await sb.from('wallet_public').select('*')), out = {};
        rows.forEach(r => out[r.user_id] = { equip: r.equip || {}, boosts: r.boosts || {}, coins: r.coins || 0 });
        return out;
      },
      async shopLog() {
        const cut = new Date(Date.now() - LOG_DAYS * 864e5).toISOString();
        return ok(await sb.from('shop_log').select('*').gte('created_at', cut).order('created_at', { ascending: false }));
      },
      async adminWallets() { const rows = ok(await sb.from('wallets').select('*')), out = {}; rows.forEach(r => out[r.user_id] = Object.assign(emptyWallet(), r)); return out; },
      async giveCoins(me, nick, to, amount, note) { return ok(await sb.rpc('admin_give_coins', { p_user: to, p_amount: parseInt(amount, 10) || 0, p_note: String(note || '').slice(0, 60) })); },
      async equip(me, kind, id) { return ok(await sb.rpc('equip_item', { p_kind: kind, p_id: id || null })); },
      async useSnack() { return ok(await sb.rpc('use_snack')); },
      // 호감도 · 선물 영전은 서버에서만 계산해요 (사이트 코드를 고쳐도 하루 +5 · 선물 한 번씩을 못 넘어요)
      async catPet(me, up) { const r = ok(await sb.rpc('cat_pet', { p_up: !!up })); return Object.assign({}, r, { wallet: Object.assign(emptyWallet(), r.wallet || {}), rewards: r.rewards || [] }); },      // 미니 게임: 배수 뽑기 · 정산 · 하루 한 판은 전부 서버에서
      async pangStatus() { return ok(await sb.rpc('pang_status')); },
      async pangStart(me, bet, level) { return ok(await sb.rpc('pang_start', { p_bet: parseInt(bet, 10) || 0, p_level: level })); },
      // 점수는 서버 함수가 직접 계산해요 (움직인 기록만 보내요)
      async pangFinish(me, moves) { const { data, error } = await sb.functions.invoke('pang-finish', { body: { moves } }); if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(koError(m)); } if (data && data.error) throw new Error(data.error); return data; },
      // 캐릭터는 공개용 뷰(characters_view)로 읽어요 — 남의 작성본(draft)은 비어서 와요
      async list(t) { return ok(await sb.from(t === 'characters' ? 'characters_view' : t).select('*').order('created_at', { ascending: true })); },
      // 이름 · 색만 (심박 창처럼 캐릭터 전체 내용이 필요 없는 곳 · 훨씬 가벼워요)
      async charNames() { return ok(await sb.from('characters_view').select('id,owner_id,author,published_at,name:data->>name,color:data->>color').order('created_at', { ascending: true })).map(c => ({ id: c.id, owner_id: c.owner_id, author: c.author, published_at: c.published_at, data: { name: c.name || '', color: c.color || '' } })); },
      async get(t, id) { return ok(await sb.from(t === 'characters' ? 'characters_view' : t).select('*').eq('id', id).maybeSingle()); },
      async insert(t, row) { return ok(await sb.from(t).insert(row).select().single()); },
      async update(t, id, patch) { return ok(await sb.from(t).update(patch).eq('id', id).select().single()); },
      async remove(t, id) { ok(await sb.from(t).delete().eq('id', id)); }
    };
  }

  function koError(m) {
    if (/Invalid login credentials/i.test(m)) return '아이디 또는 비밀번호가 맞지 않아요.';
    if (/already registered/i.test(m)) return '이미 있는 아이디예요.';
    if (/Email not confirmed/i.test(m)) return '메일함에서 가입 인증 링크를 먼저 눌러 주세요.';
    if (/Password should be at least/i.test(m)) return '비밀번호는 6자 이상이어야 해요.';
    if (/signup_closed|Database error saving new user/i.test(m)) return '지금은 회원가입을 받지 않고 있어요.';
    if (/row-level security/i.test(m)) return '권한이 없어요. 등록·수정 기간인지 확인해 주세요.';
    return m;
  }

  /* ---------------- 기간 계산 (화면 표시용, 실제 차단은 서버 규칙) ---------------- */
  function windowState(s, kind) {
    const mode = s[kind + '_mode'];
    if (mode === 'open') return { open: true, mode };
    if (mode === 'scheduled') {
      const t = Date.now(), a = Date.parse(s[kind + '_start']), b = Date.parse(s[kind + '_end']);
      if (t >= a && t <= b) return { open: true, mode, until: s[kind + '_end'] };
      if (t < a) return { open: false, mode, next: s[kind + '_start'], nextEnd: s[kind + '_end'] };
    }
    return { open: false, mode };
  }

  const B = remote || local;
  let cachedUser, cachedSettings, cachedGrants, cachedBadges;

  window.Store = {
    mode: remote ? 'supabase' : 'demo',
    DAILY, dayStart, DEFAULT_SETTINGS,
    async user() {
      if (cachedUser === undefined) cachedUser = await B.user();
      return cachedUser;
    },
    async isAdmin() { const u = await this.user(); return !!(u && u.grade === 'admin'); },
    checkId, checkPw,
    async usernameAvailable(id) { id = checkId(id); return B.usernameAvailable(id); },
    async signUp(id, pw, nickname, contact) {
      id = checkId(id); checkPw(pw);
      nickname = String(nickname || '').trim(); if (!nickname) throw new Error('닉네임을 입력해 주세요.');
      if (!(await B.usernameAvailable(id))) throw new Error('이미 있는 아이디예요.');
      const r = await B.signUp(id, pw, nickname, contact); cachedUser = r.user || null; return r;
    },
    async signIn(id, pw) {
      id = String(id || '').trim().toLowerCase();
      if (!id || !pw) throw new Error('아이디와 비밀번호를 입력해 주세요.');
      const r = await B.signIn(id, pw); cachedUser = r.user; return r;
    },
    async signOut() { await B.signOut(); cachedUser = null; },
    /* 명부: 승인된 회원만 (관리자 페이지는 allProfiles) */
    async profiles() { return (await B.profiles()).filter(p => (p.approval || 'approved') === 'approved'); },
    async allProfiles() { await this.requireAdmin(); return B.profiles(); },
    async setApproval(id, approval) { await this.requireAdmin(); return B.setApproval(id, approval); },
    async updateProfile(patch) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      const clean = Object.assign({}, patch); delete clean.grade;
      const p = await B.updateProfile(u.id, clean);
      if (clean.nickname) u.nickname = clean.nickname;
      return p;
    },

    /* 사이트 설정 */
    async settings(fresh) { if (fresh || !cachedSettings) cachedSettings = await B.settings(); return cachedSettings; },
    async saveSettings(patch) { await this.requireAdmin(); const s = await B.saveSettings(patch); cachedSettings = null; return s; },
    windowState,

    /* 권한
       save   : 작성본 저장 — 본인 것은 언제나 · 새 캐릭터 만들기는 등록 기간(또는 예외 허용)에만 · 관리자는 전부
       submit : 제출 — 본인 것만, 등록 기간(첫 등록) / 수정 기간(게시된 캐릭터) 안에만
       publish: 게시·반려 — 관리자만
       delete : 삭제 — 관리자만
       create/edit : 기간 계산 (submit 이 내부적으로 사용) */
    async can(kind, row) {
      const u = await this.user();
      if (!u) return { ok: false, reason: '로그인이 필요해요.' };
      const isAdmin = u.grade === 'admin';
      if (kind === 'save') {
        if (!row && !isAdmin) { const c = await this.can('create'); return c.ok ? { ok: true } : { ok: false, reason: c.reason.replace('등록 기간이', '새 인물 등록 기간이') }; }   // 등록을 잠그면 새 캐릭터도 못 만들어요
        return (!row || row.owner_id === u.id || isAdmin) ? { ok: true, admin: isAdmin } : { ok: false, reason: '본인이 작성한 인물만 수정할 수 있어요.' };
      }
      if (kind === 'publish' || kind === 'delete') return isAdmin ? { ok: true, admin: true } : { ok: false, reason: kind === 'delete' ? '삭제는 관리자만 할 수 있어요.' : '게시는 관리자만 할 수 있어요.' };
      if (kind === 'submit') {
        if (row && row.owner_id !== u.id && !isAdmin) return { ok: false, reason: '본인이 작성한 인물만 제출할 수 있어요.' };
        if (row && (row.status === 'returned' || row.review_note)) return { ok: true };   // 반려된 프로필(반려 메모가 있는 것)은 고쳐서 언제든 다시 제출
        return this.can(row && row.published_at ? 'edit' : 'create', row);
      }
      if (isAdmin) return { ok: true, admin: true };
      if (kind === 'edit' && row && row.owner_id !== u.id) return { ok: false, reason: '본인이 작성한 인물만 수정할 수 있어요.' };
      const s = await this.settings();
      const w = windowState(s, kind);
      if (w.open) return { ok: true, until: w.until };
      if (!cachedGrants) cachedGrants = await B.grants().catch(() => []);
      const g = cachedGrants.find(x => x.user_id === u.id && x.kind === kind && Date.parse(x.until) > Date.now());
      if (g) return { ok: true, until: g.until, grant: true };
      const label = kind === 'create' ? '등록' : '수정';
      return { ok: false, reason: w.next ? `${label} 기간이 아니에요. (다음 기간: ${fmtWhen(w.next)} ~ ${fmtWhen(w.nextEnd)})` : `지금은 ${label} 기간이 아니에요.`, next: w.next };
    },

    /* 관리자 전용 */
    async requireAdmin() { if (!(await this.isAdmin())) throw new Error('관리자만 할 수 있어요.'); },
    async grants() { cachedGrants = await B.grants(); return cachedGrants; },
    async addGrant(g) { await this.requireAdmin(); cachedGrants = null; return B.addGrant(g); },
    async removeGrant(id) { await this.requireAdmin(); cachedGrants = null; return B.removeGrant(id); },
    async setGrade(id, grade) { await this.requireAdmin(); return B.setGrade(id, grade); },
    async adminUpdateProfile(id, patch) { await this.requireAdmin(); return B.updateProfile(id, patch); },
    async setPassword(id, pw) {
      await this.requireAdmin();
      if (String(pw).length < 6) throw new Error('비밀번호는 6자 이상이어야 해요.');
      return B.setPassword(id, pw);
    },
    async deleteUser(id) { await this.requireAdmin(); return B.deleteUser(id); },

    /* 텔레파시 */
    async teles() { const u = await this.user(); return u ? B.teles(u.id) : []; },
    async sendTele(p) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      return B.sendTele(u.id, u.nickname, p);
    },
    async markTeleRead(id) { const u = await this.user(); if (u) await B.markTeleRead(u.id, id); },
    /* 출석 · 지갑 · 상점 (영전 지급과 구매는 서버 함수에서만) */
    kstDay, streakOf, ATTEND, attendReward,
    async wallet() { const u = await this.user(); return u ? B.wallet(u.id) : emptyWallet(); },
    async attendance(from) { return (await this.user()) ? B.attendance(from) : []; },
    async myAttendance(from) { const u = await this.user(); return u ? B.attendance(from, u.id) : []; },
    async checkIn(comment) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.checkIn(u.id, u.nickname, comment); },
    STATS, LOG_DAYS, isFromTitle, soldOut,
    /* 칭호 글자: {from} 자리에 선물한 사람 닉네임 → titleText(칭호 물건, 그 사람의 equip) */
    titleText,
    async shopItems(all) { return B.shopItems(all); },
    async saveShopItem(item) { await this.requireAdmin(); return B.saveShopItem(item); },
    /* 사기 · 선물하기: opt = { to: 받는 사람 id (없으면 나), char: 스탯 증가권을 쓸 캐릭터 id } → { wallet, detail } */
    async buy(id, opt) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); cachedBadges = null; return B.buy(u.id, u.nickname, id, opt || {}); },
    /* 모두의 칭호 · 스탯 보너스 · 보유 영전 { user_id: { equip, boosts, coins } } */
    async badges() { if (!(await this.user())) return {}; if (!cachedBadges) cachedBadges = await B.badges().catch(() => ({})); return cachedBadges; },
    async shopLog() { await this.requireAdmin(); return B.shopLog(); },
    /* 관리자: 모든 회원 지갑 { user_id: wallet } · 영전 지급(음수면 회수) */
    async adminWallets() { await this.requireAdmin(); return B.adminWallets(); },
    async giveCoins(to, amount, note) { await this.requireAdmin(); const u = await this.user(); cachedBadges = null; return B.giveCoins(u.id, u.nickname, to, amount, note); },
    /* 칭호 + 스탯 보너스 계산: 칭호에 걸린 스탯 + 그 캐릭터에 쓴 스탯 증가권 */
    statBonus(badge, items, charId) {
      const out = {}; if (!badge) return out;
      const t = badge.equip && badge.equip.title && items.find(i => i.id === badge.equip.title);
      const add = o => Object.entries(o || {}).forEach(([k, v]) => { const n = parseFloat(v); if (n) out[k] = (out[k] || 0) + n; });
      if (t) add(t.stats); add((badge.boosts || {})[charId]);
      return out;
    },
    async equip(kind, id) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); cachedBadges = null; return B.equip(u.id, kind, id); },
    async useSnack() { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.useSnack(u.id); },
    /* 고양이 쓰다듬기: up=true 면 +1 (하루 +5까지) · false 면 삐짐 -2 (하루 한 번) → { wallet, gift, unlocked, changed } */
    async catPet(up) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.catPet(u.id, up); },    CAT, affToday,
    /* 미니 게임: 오늘 했는지 { played, done, win, mult, delta } · 시작(영전 걸기) · 끝(점수 → 정산 결과) */
    PANG, PANG_LEVELS, PANG_MULT, pangLevel,
    async pangStatus() { const u = await this.user(); if (!u) return { played: false }; return B.pangStatus(u.id); },
    async pangStart(bet, level) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.pangStart(u.id, bet, level); },
    async pangFinish(moves) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); cachedBadges = null; return B.pangFinish(u.id, moves); },

    /* ---------- 캐릭터: 작성본 → 제출 → 게시 ----------
       data  = 게시본 (모두에게 보임)      draft = 작성본 (본인·관리자만)
       status: draft(작성 중) / submitted(심사 대기) / returned(반려) / published(게시됨)
       published_at 이 있으면 공개된 캐릭터예요. */
    isPublic: r => !!(r && r.published_at),
    /* 공개 목록: 게시된 캐릭터만 (게시본 기준) */
    async list(t) {
      const rows = await B.list(t);
      return t === 'characters' ? rows.filter(r => r.published_at) : rows;
    },
    /* 이름 · 색만 담은 가벼운 목록 (게시된 캐릭터만) */
    async charNames() { return (await B.charNames()).filter(r => r.published_at); },
    get: (t, id) => B.get(t, id),
    async myCharacters() { const u = await this.user(); if (!u) return []; return (await B.list('characters')).filter(r => r.owner_id === u.id); },
    async adminCharacters() { await this.requireAdmin(); return B.list('characters'); },

    /* 작성본 저장 (언제나). 새 캐릭터면 만들어요. 제출·반려 상태였다면 다시 "작성 중"으로 */
    async saveDraft(id, draft) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      if (!id) {
        const c = await this.can('save', null); if (!c.ok) throw new Error(c.reason);   // 등록을 잠그면 새 캐릭터를 못 만들어요
        const r = await B.insert('characters', { owner_id: u.id, author: u.nickname, data: {}, draft, status: 'draft', published_at: null, submitted_at: null, review_note: '' });
        return r;
      }
      const row = await B.get('characters', id);
      const c = await this.can('save', row); if (!c.ok) throw new Error(c.reason);
      const patch = { draft, updated_at: now() };
      if (row.status !== 'draft') patch.status = 'draft';
      const r = await B.update('characters', id, patch);
      return r;
    },
    async submit(id) {
      const u = await this.user(); const row = await B.get('characters', id);
      if (!row.draft) throw new Error('제출할 작성본이 없어요.');
      const c = await this.can('submit', row); if (!c.ok) throw new Error(c.reason);
      const r = await B.update('characters', id, { status: 'submitted', submitted_at: now() });   // 반려 메모는 게시할 때 지워져요
      return r;
    },
    async withdraw(id) {
      const u = await this.user(); const row = await B.get('characters', id);
      const c = await this.can('save', row); if (!c.ok) throw new Error(c.reason);
      if (row.status !== 'submitted') throw new Error('심사 대기 중인 캐릭터가 아니에요.');
      const r = await B.update('characters', id, { status: 'draft' });
      return r;
    },
    async publish(id) {
      await this.requireAdmin(); const u = await this.user(); const row = await B.get('characters', id);
      const data = row.draft || row.data;
      const r = await B.update('characters', id, { data, draft: null, status: 'published', published_at: now(), review_note: '', updated_at: now() });
      return r;
    },
    async reject(id, note) {
      await this.requireAdmin(); const u = await this.user(); const row = await B.get('characters', id);
      // 반려 = '작성 중'으로 돌려보내기 (본인 · 관리자만 보여요) · 게시 해제 + 게시본을 작성본으로 옮겨서 바로 고칠 수 있게
      // review_note 는 회원에게 보이지 않는 반려 표시 → 기간과 상관없이 다시 제출할 수 있어요 (게시하면 지워져요)
      const memo = String(note || '').trim().slice(0, 300) || '반려';
      const r = await B.update('characters', id, { status: 'draft', review_note: memo, published_at: null, draft: row.draft || row.data });
      return r;
    },

    /* 다른 표 (쪽지·실 등) */
    async insert(t, row) {
      const u = await this.user();
      if (!u) throw new Error('로그인이 필요해요.');
      if (t === 'characters') throw new Error('캐릭터는 saveDraft 로 저장해요.');
      return B.insert(t, Object.assign({}, row, { owner_id: u.id, author: u.nickname }));
    },
    async update(t, id, patch) {
      if (t === 'characters') { await this.requireAdmin(); return B.update(t, id, patch); }
      if (t === 'npcs') await this.requireOwner(t, id);
      return B.update(t, id, patch);
    },
    // NPC: 쓴 사람이나 관리자만 고치고 지울 수 있어요
    async requireOwner(t, id) {
      const u = await this.user(); const row = await B.get(t, id);
      if (!u || !row || (row.owner_id !== u.id && u.grade !== 'admin')) throw new Error('작성한 사람이나 관리자만 할 수 있어요.');
    },
    async remove(t, id) {
      if (t === 'npcs') { await this.requireOwner(t, id); return B.remove(t, id); }
      if (t === 'characters') {
        const c = await this.can('delete'); if (!c.ok) throw new Error(c.reason);
        await B.remove(t, id);
        return;
      }
      return B.remove(t, id);
    }
  };
  function fmtWhen(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
})();

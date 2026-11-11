
(function () {
  const cfg = window.SITE_CONFIG || {};
  const remoteOn = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const SESSION_IDLE_MS = 5 * 60 * 1000;
  const ACTIVITY_KEY = 'naru:last-activity';
  let lastActivity = 0;
  try { localStorage.removeItem('naru:remember-id'); } catch (e) {}
  /* 잠깐 기억해 두기: 페이지를 옮겨도 같은 정보를 서버에 다시 묻지 않아요 (이 탭에서만 · 로그아웃하면 비워요) */
  const CACHE = 'naru:c:';
  const hold = async (key, ms, load) => {
    if (!remoteOn) return load();
    try { const c = JSON.parse(sessionStorage.getItem(CACHE + key)); if (c && Date.now() - c.t < ms) return c.v; } catch (e) {}
    const v = await load();
    try { sessionStorage.setItem(CACHE + key, JSON.stringify({ t: Date.now(), v })); } catch (e) {}
    return v;
  };
  const drop = (...keys) => { try {
    if (keys.length) keys.forEach(k => sessionStorage.removeItem(CACHE + k));
    else Object.keys(sessionStorage).filter(k => k.startsWith(CACHE)).forEach(k => sessionStorage.removeItem(k));
  } catch (e) {} };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const now = () => new Date().toISOString();
  const byCreated = (a, b) => String(a.created_at).localeCompare(String(b.created_at));

  const DAILY = 1; // 심박(텔레파시): 한 사람당 하루 무료 횟수 (캐릭터 수와 상관없이 · 다음 날로 쌓이지 않아요) · 더 보내려면 상점의 심박권(k_beat)
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
  /* 출석 · 상점 — 날짜는 한국 시간 기준 'YYYY-MM-DD' */
  const kstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
  const lessonDay = (t = Date.now()) => kstDay(t - 8 * 3600e3);   // 수업의 하루는 오전 8시부터 (⚠ 수업-9시.sql lesson_day 와 같게)
  // 출석 영전: 연속 출석 1~7일째에 받는 양 · 7일을 채우면 다음 날부터 다시 1일째 (하루라도 빠져도 1일째로)
  const ATTEND = { week: [10, 15, 20, 25, 30, 30, 50] };
  const attendReward = streak => ATTEND.week[(Math.max(1, streak) - 1) % 7];
  const STATS = ['근력', '지력', '이성', '술력', '외모', '재력', '행운'];
  const FROM = '{from}', isFromTitle = it => !!it && it.kind === 'title' && String(it.value || '').includes(FROM);
  const titleText = (it, equip) => it ? String(it.value || '').split(FROM).join(((equip && equip.from) || {})[it.id] || '누군가') : '';
  const CAT = { max: 200, full: 100, daily: 5 };   // 고양이 호감도: 화면에 보이는 값만
  const PANG_LEVELS = [
    { id: 'normal',  name: '보통',        han: 'LV.1', target: 2800, secs: 60, glass: false, mx: '×1.5 ~ ×4' },
    { id: 'hard',    name: '매우 어려움', han: 'LV.2', target: 3000, secs: 45, glass: false, mx: '×1.5 ~ ×6' },
    { id: 'hell',    name: '지옥',        han: 'LV.3', target: 4000, secs: 30, glass: true, mx: '×6 ~ ×15' },
    { id: 'extreme', name: '극악',        han: 'LV.4', target: 5000, secs: 25, glass: true, mx: '×6 ~ ×30' }
  ];
  const pangLevel = id => PANG_LEVELS.find(l => l.id === id) || PANG_LEVELS[0];
  const PANG = { min: 50, max: 1000, ext: 30, grace: 300 };   // ext: 모래시계로 늘릴 수 있는 최대 시간(초)
  const LESSONS = {
    // n: 하루 문제 수 · pts: 한 문제 점수 배수 (문제 수가 줄어든 만큼) · 하루 두 과목까지 · ⚠ 수업-문제수.sql lesson_cfg 와 같게
    // max: 만점 · 등급은 모든 과목 만점 대비 % (80 甲 · 60 乙 · 30 丙)
    // 모든 과목 15초 · 시간 구간 점수 (3초 100% · 5초 80% · 10초 55% · 15초 30% · 넘으면 −20%) · ⚠ 수업-시간.sql 과 같게
    kor:  { name: '국어', han: '國語', title: '수배서', stat: '지력', n: 4, secs: 15, lives: 3, max: 5000 },
    soc:  { name: '사회', han: '社會', title: '가서', stat: '이성', n: 1, secs: 15, max: 3000 },
    mor:  { name: '도덕심', han: '道德', title: '시봉', stat: '근력', n: 2, secs: 15, hearts: 5, love: 1.2, max: 3000 },   // 2문제 = 서로 다른 두 인물
    art:  { name: '미술', han: '美術', title: '스토리', stat: '행운', n: 2, secs: 15, max: 3000 }
  };
  const GRADES = ['甲', '乙', '丙', '丁'];
  const POUCH_DAY = 3;
  const MATCH = { cool: 48, wait: 30, coin: [1000, 5000], stat: [1, 5], turn: 600 };   // 대국: 이틀(48시간)에 1판 · 방 30분 · 영전 1,000~5,000 · 술력 1~5 · 한 수 10분
  const soldOut = it => !!(it && it.stock && (it.sold || 0) >= it.stock);
  const LOG_DAYS = 3; // 상점 기록은 3일 지나면 지워져요
  const streakOf = (days, today = kstDay()) => { // 오늘(또는 어제)까지 이어진 연속 출석 일수
    const set = new Set(days); let d = new Date(today + 'T00:00:00Z'), n = 0;
    if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
    return n;
  };
  const emptyWallet = () => ({ coin_notes: [], coins: 0, items: [], equip: {}, snacks: 0, tickets: {}, boosts: {}, boost_n: 0, aff: 0, aff_day: null, aff_gain: 0, aff_drop: null, aff_gifts: [], cat_full: false, cat_secrets: [], perk_day: null, snack_n: 0, churu_day: null });   // perk_day: 오늘 특전을 이미 받았으면 그 날짜 (특전은 하루 하나만)
  const affToday = w => w.aff_day === kstDay() ? (w.aff_gain || 0) : 0;   // 오늘 올린 호감도
  const PROFILE_KEYS = ['nickname', 'title', 'bio', 'seal', 'role'];

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
  const STAFF_SETTINGS = ['bgm_on', 'bgm_title', 'bgm_url', 'signup_open', 'public_view', 'lobby_banners'];   // 부관리자가 바꿀 수 있는 설정
  const DEFAULT_SETTINGS = {
    bgm_url: '', bgm_title: '', bgm_on: false,
    signup_open: true, public_view: false,   // public_view: 비회원도 사이트를 둘러볼 수 있게
    lesson_on: false, match_on: false, stock_on: false,   // stock_on: 빼빼로 증권 (관리자 '빼빼로 주식' 탭에서 열고 닫아요)
      // 후계자 수업 · 대국 열기 (꺼 두면 메인에 창만 보이고 못 들어가요 · 관리자는 언제나 들어가요)
    create_mode: 'open', create_start: '', create_end: '',   // open | closed | scheduled
    edit_mode: 'closed', edit_start: '', edit_end: '',
    lobby_banners: [],   // 메인 왼쪽 아래 배너 [{ tag, title, text, link, c1, c2, angle, ghost }]
    board_stickers: ['https://i.imgur.com/RwKWE0z.png', 'https://i.imgur.com/qdfAM60.png', 'https://i.imgur.com/XhFJYF1.png', 'https://i.imgur.com/Z2BN6L8.png', 'https://i.imgur.com/hYURJd0.png', 'https://i.imgur.com/CuCgPLq.png']   // 사건 보드 스티커 (관리자 사이트 탭)
  };

  /* 데모 모드(Supabase 설정 없음)에서만: 데모 저장소 · 규칙은 demo-store.js (⚠ 사이트에 올리지 않는 파일) */
  if (!remoteOn) {
    window.__storeShared = { newId, now, byCreated, DAILY, dayStart, kstDay, lessonDay, attendReward, STATS, FROM, isFromTitle, titleText, CAT, PANG, PANG_LEVELS, pangLevel, LESSONS, GRADES, POUCH_DAY, MATCH, soldOut, LOG_DAYS, streakOf, emptyWallet, affToday, PROFILE_KEYS, DEFAULT_SETTINGS };
    document.write('<script src="assets/js/demo-store.js"><\/script>');
  }

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
        const su = data.session && data.session.user; if (!su) return null;
        const u = await hold('me:' + su.id, 6e5, () => toUser(su));
        if (!u || u.approval !== 'approved') { drop('me:' + su.id); return null; }
        return u;
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
      async signOut() { const { error } = await sb.auth.signOut({ scope: 'local' }); if (error) throw error; },
      async profiles() {
        const rows = ok(await sb.from('profiles').select('*').order('created_at', { ascending: true }));
        // 관리자에게만 읽히는 아이디·이메일 붙이기
        const me = await remote.user(); if (!me || (me.grade !== 'admin' && me.grade !== 'staff')) return rows;
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
      async staffReview(id, action, note) { return ok(await sb.rpc('staff_review', { p_id: id, p_action: action, p_note: note || '' })); },
      async setPassword(id, pw) { return adminFn({ action: 'set_password', user_id: id, password: pw }); },
      async deleteUser(id) { return adminFn({ action: 'delete_user', user_id: id }); },
      async teles() { return ok(await sb.from('tele_box').select('*').order('created_at', { ascending: true })); },
      // 안 읽은 맥박 수만 (내용은 받지 않아요)
      async teleUnread(me) { const { count, error } = await sb.from('tele_box').select('id', { count: 'exact', head: true }).eq('to_user', me).eq('read', false); if (error) throw new Error(koError(error.message)); return count || 0; },
      async sendTele(me, nick, p) {
        return ok(await sb.rpc('send_tele', { p_from_char: p.from_char, p_to_char: p.to_char, p_body: p.body }));
      },
      async markTeleRead(me, id) { ok(await sb.rpc('mark_tele_read', { p_id: id })); },
      async beatMarks(me, charId) { return ok(await sb.rpc('beat_marks', { p_char: charId })) || {}; },   // 심박을 많이 주고받은 사이 · 단계만 (두 당사자에게만)
      async touch(me, page) { await sb.rpc('touch', { p: page }); },
      async rptA() { return ok(await sb.rpc('rpt_a')) || []; },
      async rptB() { return ok(await sb.rpc('rpt_b')) || []; },
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
      async checkIn(me, nick, comment) { return ok(await sb.rpc('check_in_x', { p_comment: String(comment || '').slice(0, 60) })); },   // check_in + 재력 특전
      async shopItems(all) {
        let q = sb.from('shop_items').select('*').order('sort', { ascending: true });
        if (!all) q = q.eq('active', true);
        const [rows, sold] = await Promise.all([q.then(ok), sb.from('shop_sold').select('*').then(ok).catch(() => [])]);
        const n = {}; sold.forEach(s => n[s.id] = s.sold);
        return rows.map(r => Object.assign({}, r, { sold: n[r.id] || 0 }));
      },
      async saveShopItem(item) { const { id, ...patch } = item; return ok(await sb.from('shop_items').update(patch).eq('id', id).select().single()); },
      async buy(me, nick, id, opt = {}) {
        if (/^(p_|h_)/.test(id)) {   // 복주머니 · 응원 쪽지는 따로 (결과 · 쪽지를 서버에서)
          const s = ok(await sb.rpc('shop_special', { p_id: id, p_to: opt.to || null, p_msg: String(opt.msg || '').slice(0, 40), p_amount: Math.floor(Number(opt.amount) || 0) }));
          return { wallet: Object.assign(emptyWallet(), s.wallet || {}), detail: s.detail || '', pouch: s.pouch || null, luck: s.luck || null };
        }
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
      async statBoard() { return ok(await sb.rpc('admin_stat_board')) || { avg: {}, rows: [] }; },
      async giveBulk(ids, amount, note) { return ok(await sb.rpc('admin_give_bulk', { p_users: ids, p_amount: parseInt(amount, 10) || 0, p_note: String(note || '').slice(0, 60) })); },
      async giftBulk(ids, note) { return ok(await sb.rpc('admin_gift_bulk', { p_chars: ids, p_note: String(note || '').slice(0, 60) })); },
      async coinNotesSeen() { ok(await sb.rpc('coin_notes_seen')); },
      async giveCoins(me, nick, to, amount, note) { return ok(await sb.rpc('admin_give_coins', { p_user: to, p_amount: parseInt(amount, 10) || 0, p_note: String(note || '').slice(0, 60) })); },
      async equip(me, kind, id) { return ok(await sb.rpc('equip_item', { p_kind: kind, p_id: id || null })); },
      async useSnack() { const r = ok(await sb.rpc('use_snack')); return Object.assign({}, r, { wallet: Object.assign(emptyWallet(), r.wallet || {}), rewards: r.rewards || [] }); },
      async catPet(me, up) { const r = ok(await sb.rpc('cat_pet_x', { p_up: !!up })); return Object.assign({}, r, { wallet: Object.assign(emptyWallet(), r.wallet || {}), rewards: r.rewards || [] }); },      // 미니 게임: 배수 뽑기 · 정산 · 하루 한 판은 전부 서버에서
      async pangStatus() { return ok(await sb.rpc('pang_status')); },
      async pangStart(me, bet, level) { return ok(await sb.rpc('pang_start', { p_bet: parseInt(bet, 10) || 0, p_level: level })); },
      async pangFinish(me, moves) { const { data, error } = await sb.functions.invoke('pang-finish', { body: { moves } }); if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(koError(m)); } if (data && data.error) throw new Error(data.error); return data; },
      async lessonStatus() { return ok(await sb.rpc('lesson_status')); },
      async lessonItems(subj) { return ok(await sb.rpc('lesson_items', { p_subj: subj })) || []; },
      async lessonItemSave(subj, it) { return ok(await sb.rpc('lesson_item_save', { p_subj: subj, p_item: it })); },
      async lessonItemDel(subj, id) { return ok(await sb.rpc('lesson_item_del', { p_subj: subj, p_id: id })); },
      async lessonStart(me, subj, charId, msg) { return ok(await sb.rpc('lesson_start_x', { p_subj: subj, p_char: charId, p_msg: msg || '', p_art: null })); },   
      async lessonAnswer(me, choice) { return ok(await sb.rpc('lesson_answer_l', { p_choice: choice })); },
      async lessonNext() { return ok(await sb.rpc('lesson_next')); },
      async lessonHint() { return ok(await sb.rpc('lesson_hint')); },
      async noteStickerAdd(me, noteId, url) { return ok(await sb.rpc('note_sticker_add', { p_note: noteId, p_url: url })) || []; },
      async noteStickerDel(me, noteId, id) { return ok(await sb.rpc('note_sticker_del', { p_note: noteId, p_id: id })) || []; },
      async adminLessonsToday() { return ok(await sb.rpc('admin_lessons_today')) || []; },
      async adminLessonReset(id) { return ok(await sb.rpc('admin_lesson_reset', { p_id: id })); },
      // 빼빼로 증권: 규칙 · 가격은 서버 함수 · 전광판 한 줄만 실시간으로 받아요 (화면을 연 동안만 · 주기적 요청 없음)
      async stockView() { return ok(await sb.rpc('stock_view')); },
      async stockJoin(me, charId) { return ok(await sb.rpc('stock_join', { p_char: charId })); },
      async stockTrade(me, charId, qty) { return ok(await sb.rpc('stock_trade', { p_char: charId, p_qty: qty })); },
      stockSub(cb) {
        const ch = sb.channel('stock-board').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stock_board' }, p => { if (p && p.new && p.new.data) cb(p.new.data); }).subscribe();
        return { stop() { sb.removeChannel(ch); } };
      },
      async stockAdmin() { return ok(await sb.rpc('stock_admin')); },
      async stockOpen(ends, cash) { return ok(await sb.rpc('stock_open', { p_ends: ends, p_cash: cash })); },
      async stockClose() { return ok(await sb.rpc('stock_close')); },
      async stockPickNext(ids) { return ok(await sb.rpc('stock_pick_next', { p_ids: ids })); },
      async stockReward() { return ok(await sb.rpc('stock_reward')); },
      // 대국: 방 · 정산은 서버 함수 · 수 검사는 match-move · 상대가 둘 때만 신호를 받아요 (화면을 연 동안만)
      async matchStatus() { return ok(await sb.rpc('match_status')); },
      async matchRooms() { return ok(await sb.rpc('match_rooms')) || []; },
      async matchOpen(me, game, bet, msg) { return ok(await sb.rpc('match_open', { p_game: game, p_kind: bet.kind, p_amount: bet.kind === 'msg' ? 0 : Math.floor(Number(bet.amount) || 0), p_msg: String(msg || '').slice(0, 300) })); },
      async matchCancel(me, id) { ok(await sb.rpc('match_cancel', { p_id: id })); },
      async matchJoin(me, id, msg, bet) { return ok(await sb.rpc('match_join', { p_id: id, p_kind: bet.kind, p_amount: bet.kind === 'msg' ? 0 : Math.floor(Number(bet.amount) || 0), p_msg: String(msg || '').slice(0, 300) })); },
      async matchView(me, id) { return ok(await sb.rpc('match_view', { p_id: id })); },
      async matchMove(me, id, action) { const { data, error } = await sb.functions.invoke('match-move', { body: { id, action } }); if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(koError(m)); } if (data && data.error) throw new Error(data.error); return data; },
      matchSub(id, cb) {
        const ch = sb.channel('m:' + id, { config: { broadcast: { self: false } } });
        const ping = () => ch.send({ type: 'broadcast', event: 'p', payload: {} }).catch(() => {});
        ch.on('broadcast', { event: 'p' }, () => cb()).subscribe(st => { if (st === 'SUBSCRIBED') ping(); });
        const t = setInterval(() => { if (!document.hidden) cb(); }, 20000);   // 신호를 놓쳤을 때를 대비해서 20초마다 한 번
        return { ping, stop() { clearInterval(t); sb.removeChannel(ch); } };
      },
      async cheersToday() { return ok(await sb.rpc('cheers_today')) || []; },
      async adminGiftBox(me, nick, charId) { return ok(await sb.rpc('admin_gift_box', { p_char: charId })); },
      async myGifts() { return ok(await sb.rpc('my_gifts')) || []; },
      async openGift(me, id, pick) { return ok(await sb.rpc('open_gift', { p_id: id, p_pick: pick })); },
      async lessonRank(me, subj) { return ok(await sb.rpc('lesson_rank', { p_subj: subj })) || []; },
      // 캐릭터는 공개용 뷰(characters_view)로 읽어요 — 남의 작성본(draft)은 비어서 와요
      async list(t) { return ok(await sb.from(t === 'characters' ? 'characters_view' : t).select('*').order('created_at', { ascending: true })); },
      // 이름 · 색만 (심박 창처럼 캐릭터 전체 내용이 필요 없는 곳 · 훨씬 가벼워요)
      async charNames() { return ok(await sb.from('characters_view').select('id,owner_id,author,published_at,name:data->>name,color:data->>color').order('created_at', { ascending: true })).map(c => ({ id: c.id, owner_id: c.owner_id, author: c.author, published_at: c.published_at, data: { name: c.name || '', color: c.color || '' } })); },
      // 목록 화면은 긴 본문·스킬·작성본 대신 카드에 쓰는 JSON 필드만 받아요.
      async charCards() {
        const fields = ['name', 'name_en', 'team', 'org', 'affiliation', 'rank', 'danger', 'element', 'color', 'head', 'images', 'image', 'silhouette', 'stats', 'phoneBg'];
        const columns = ['id', 'owner_id', 'author', 'created_at', 'published_at'].concat(fields.map(k => `${k}:data->${k}`)).join(',');
        const rows = ok(await sb.from('characters_view').select(columns).not('published_at', 'is', null).order('created_at', { ascending: true }));
        return rows.map(row => {
          const data = {};
          fields.forEach(k => {
            if (row[k] != null) data[k] = row[k];
            delete row[k];
          });
          return Object.assign(row, { data });
        });
      },
      // 이 캐릭터를 관계란에 넣은 캐릭터의 관계란만 받아요 (프로필 화면 · 관계 휴대폰)
      async charsRelatedTo(id) { return ok(await sb.from('characters_view').select('id,related:data->related').not('published_at', 'is', null).filter('data->related', 'cs', JSON.stringify([{ id }]))); },
      async submitLive(id) { ok(await sb.rpc('submit_live', { p_id: id })); },
      async restAll() { return ok(await sb.rpc('rest_all')); },
      async myCharacters(id) { return ok(await sb.from('characters_view').select('*').eq('owner_id', id).order('created_at', { ascending: true })); },
      async myCharacterNews(id) {
        const rows = ok(await sb.from('characters_view').select('id,status,published_at,review_note,name:data->>name,draft_name:draft->>name').eq('owner_id', id));
        return rows.map(row => Object.assign(row, { data: { name: row.name }, draft: row.draft_name == null ? null : { name: row.draft_name } }));
      },
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

  const B = remote || new Proxy({}, { get: (_, k) => { const L = window.DemoBackend; if (!L) throw new Error('데모 저장소(demo-store.js)를 불러오지 못했어요.'); const v = L[k]; return typeof v === 'function' ? v.bind(L) : v; } });
  let cachedUser, cachedSettings, cachedGrants, cachedBadges;
  const dropBadges = () => { cachedBadges = null; drop('badges'); };
  const dropChars = () => drop('cards', 'names');

  window.Store = {
    mode: remote ? 'supabase' : 'demo',
    DAILY, dayStart, DEFAULT_SETTINGS, SESSION_IDLE_MS, ACTIVITY_KEY,
    sessionActivity() {
      try { return Number(localStorage.getItem(ACTIVITY_KEY)) || 0; } catch (e) { return lastActivity; }
    },
    sessionExpired() {
      const activity = this.sessionActivity();
      return !Number.isFinite(activity) || activity <= 0 || activity > Date.now() || Date.now() - activity >= SESSION_IDLE_MS;
    },
    recordActivity() {
      lastActivity = Date.now();
      try { localStorage.setItem(ACTIVITY_KEY, String(lastActivity)); } catch (e) {}
    },
    async user() {
      if (cachedUser === undefined) {
        cachedUser = await B.user();
        let asStaff = false; try { asStaff = localStorage.getItem('naru:asStaff') === '1'; } catch (e) {}   // 관리자 '부관리자 화면으로 보기'
        if (cachedUser && cachedUser.grade === 'admin' && asStaff) cachedUser = Object.assign({}, cachedUser, { grade: 'staff', realGrade: 'admin' });
      }
      return cachedUser;
    },
    async isAdmin() { const u = await this.user(); return !!(u && u.grade === 'admin'); },
    /* 부관리자(staff) 포함: 심사 대기 · 회원 정보 · 영전 지급 · 사이트 설정 · 메인 배너만 */
    async isStaff() { const u = await this.user(); return !!(u && (u.grade === 'admin' || u.grade === 'staff')); },
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
      drop(); const r = await B.signIn(id, pw); cachedUser = r.user; this.recordActivity(); return r;
    },
    async signOut() {
      try { await B.signOut(); }
      finally {
        cachedUser = null; lastActivity = 0; drop();
        try { localStorage.removeItem(ACTIVITY_KEY); } catch (e) {}
      }
    },
    /* 명부: 승인된 회원만 (관리자 페이지는 allProfiles) */
    async profiles() { return (await hold('profiles', 3e5, () => B.profiles())).filter(p => (p.approval || 'approved') === 'approved'); },
    async allProfiles() { await this.requireStaff(); return B.profiles(); },
    async setApproval(id, approval) { await this.requireAdmin(); return B.setApproval(id, approval); },
    async updateProfile(patch) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      const clean = Object.assign({}, patch); delete clean.grade;
      const p = await B.updateProfile(u.id, clean);
      drop('profiles', 'me:' + u.id);
      if (clean.nickname) u.nickname = clean.nickname;
      return p;
    },

    /* 사이트 설정 */
    async settings(fresh) { if (fresh) drop('settings'); if (fresh || !cachedSettings) cachedSettings = await hold('settings', 3e5, () => B.settings()); return cachedSettings; },
    async saveSettings(patch) {
      await this.requireStaff();
      if (!(await this.isAdmin()) && Object.keys(patch).some(k => !STAFF_SETTINGS.includes(k))) throw new Error('이 설정은 관리자만 바꿀 수 있어요.');
      const s = await B.saveSettings(patch); cachedSettings = null; drop('settings'); return s;
    },
    windowState,

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
        return this.can(row && (row.published_at || (row.data && Object.keys(row.data).length)) ? 'edit' : 'create', row);   // 레스트로 내려간 프로필도 수정 기간에만
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
    async requireStaff() { if (!(await this.isStaff())) throw new Error('관리자만 할 수 있어요.'); },
    async grants() { cachedGrants = await B.grants(); return cachedGrants; },
    async addGrant(g) { await this.requireAdmin(); cachedGrants = null; return B.addGrant(g); },
    async removeGrant(id) { await this.requireAdmin(); cachedGrants = null; return B.removeGrant(id); },
    async setGrade(id, grade) { await this.requireAdmin(); return B.setGrade(id, grade); },
    async adminUpdateProfile(id, patch) { await this.requireAdmin(); drop('profiles'); return B.updateProfile(id, patch); },
    async setPassword(id, pw) {
      await this.requireAdmin();
      if (String(pw).length < 6) throw new Error('비밀번호는 6자 이상이어야 해요.');
      return B.setPassword(id, pw);
    },
    async deleteUser(id) { await this.requireAdmin(); return B.deleteUser(id); },

    /* 텔레파시 */
    async teles(fresh) { const u = await this.user(); if (!u) return []; if (fresh) drop('teles:' + u.id); return hold('teles:' + u.id, 12e4, () => B.teles(u.id)); },
    async teleUnread() {
      const u = await this.user(); if (!u) return 0;
      return remote ? hold('unread:' + u.id, 24e4, () => B.teleUnread(u.id)) : (await B.teles(u.id)).filter(m => m.to_user === u.id && m.owner_id !== u.id && !m.read).length;
    },
    // 관계 휴대폰: 이 캐릭터와 심박을 많이 주고받은 캐릭터 → 단계(1~3). 휴대폰을 열 때 한 번만 묻고 10분 기억해요
    async beatMarks(charId) {
      const u = await this.user(); if (!u || !charId) return {};
      try { return await hold('beat:' + u.id + ':' + charId, 6e5, () => B.beatMarks(u.id, charId)); } catch (e) { return {}; }
    },
    async sendTele(p) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      drop('teles:' + u.id); return B.sendTele(u.id, u.nickname, p);
    },
    async markTeleRead(id) { const u = await this.user(); if (u) { drop('teles:' + u.id, 'unread:' + u.id); await B.markTeleRead(u.id, id); } },
    async touch(page) { const u = await this.user(); if (u) await B.touch(u.id, page).catch(() => {}); },
    async rptA() { await this.requireAdmin(); return B.rptA(); },
    async rptB() { await this.requireStaff(); return B.rptB(); },
    /* 출석 · 지갑 · 상점 (영전 지급과 구매는 서버 함수에서만) */
    kstDay, streakOf, ATTEND, attendReward,
    async wallet() { const u = await this.user(); return u ? B.wallet(u.id) : emptyWallet(); },
    async attendance(from) { return (await this.user()) ? hold('att:' + from, 12e4, () => B.attendance(from)) : []; },
    async myAttendance(from) { const u = await this.user(); return u ? B.attendance(from, u.id) : []; },
    async checkIn(comment) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); drop('att:' + kstDay()); return B.checkIn(u.id, u.nickname, comment); },
    STATS, LOG_DAYS, isFromTitle, soldOut,
    /* 칭호 글자: {from} 자리에 선물한 사람 닉네임 → titleText(칭호 물건, 그 사람의 equip) */
    titleText,
    async shopItems(all) { return hold(all ? 'shop:all' : 'shop', 3e5, () => B.shopItems(all)); },
    /* 칭호 글씨체: 관리자가 칭호마다 고른 대로 (chosun = 조선일보체 · 비어 있으면 원래 글꼴) */
    titleFont: it => it && it.font === 'chosun' ? "font-family:'ChosunNm',serif;" : '',
    async saveShopItem(item) { await this.requireAdmin(); drop('shop', 'shop:all'); return B.saveShopItem(item); },
    /* 사기 · 선물하기: opt = { to: 받는 사람 id (없으면 나), char: 스탯 증가권을 쓸 캐릭터 id } → { wallet, detail } */
    async buy(id, opt) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); dropBadges(); drop('shop', 'shop:all'); return B.buy(u.id, u.nickname, id, opt || {}); },
    /* 모두의 칭호 · 스탯 보너스 · 보유 영전 { user_id: { equip, boosts, coins } } */
    async badges() { if (!(await this.user())) return {}; if (!cachedBadges) cachedBadges = await hold('badges', 18e4, () => B.badges()).catch(() => ({})); return cachedBadges; },
    async shopLog() { await this.requireAdmin(); return B.shopLog(); },
    /* 관리자: 모든 회원 지갑 { user_id: wallet } · 영전 지급(음수면 회수) */
    async adminWallets() { await this.requireStaff(); return B.adminWallets(); },
    // 전투력 · 스탯 평균표: 계산은 서버(관리자만)에서 해서 결과만 받아요
    async statBoard() { await this.requireAdmin(); const b = await B.statBoard(); return { stats: STATS, avg: b.avg || {}, rows: b.rows || [], xcols: b.xcols || [] }; },
    async giveBulk(ids, amount, note) { await this.requireStaff(); dropBadges(); return B.giveBulk(ids, amount, note); },
    async giftBulk(ids, note) { await this.requireAdmin(); return B.giftBulk(ids, note); },
    async coinNotesSeen() { const u = await this.user(); if (u) return B.coinNotesSeen(u.id); },
    async giveCoins(to, amount, note) { await this.requireStaff(); const u = await this.user(); dropBadges(); return B.giveCoins(u.id, u.nickname, to, amount, note); },
    /* 칭호 + 스탯 보너스 계산: 칭호에 걸린 스탯 + 그 캐릭터에 쓴 스탯 증가권 */
    statBonus(badge, items, charId) {
      const out = {}; if (!badge) return out;
      const t = badge.equip && badge.equip.title && items.find(i => i.id === badge.equip.title);
      const add = o => Object.entries(o || {}).forEach(([k, v]) => { const n = parseFloat(v); if (n) out[k] = (out[k] || 0) + n; });
      if (t) add(t.stats); add((badge.boosts || {})[charId]);
      return out;
    },
    async equip(kind, id) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); dropBadges(); return B.equip(u.id, kind, id); },
    async useSnack() { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.useSnack(u.id); },
    /* 고양이 쓰다듬기: up=true 면 +1 (하루 +5까지) · false 면 삐짐 -2 (하루 한 번) → { wallet, gift, unlocked, changed } */
    async catPet(up) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.catPet(u.id, up); },    CAT, affToday,
    /* 미니 게임: 오늘 했는지 { played, done, win, mult, delta } · 시작(영전 걸기) · 끝(점수 → 정산 결과) */
    PANG, PANG_LEVELS, pangLevel,
    async pangStatus() { const u = await this.user(); if (!u) return { played: false }; return B.pangStatus(u.id); },
    async pangStart(bet, level) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.pangStart(u.id, bet, level); },
    async pangFinish(moves) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); dropBadges(); return B.pangFinish(u.id, moves); },
    LESSONS, GRADES, lessonDay,
    async playOpen(kind) {
      const [s, u] = await Promise.all([this.settings(), this.user()]);
      let asMember = false; try { asMember = localStorage.getItem('naru:asMember') === '1'; } catch (e) {}   // 관리자 '회원 화면으로 보기'
      const admin = !!(u && u.grade === 'admin') && !asMember;
      return { open: !!s[kind + '_on'] || admin, on: !!s[kind + '_on'], admin };
    },
    async lessonItems(subj) { await this.requireAdmin(); return B.lessonItems(subj); },
    async lessonItemSave(subj, it) { await this.requireAdmin(); return B.lessonItemSave(subj, it); },
    async lessonItemDel(subj, id) { await this.requireAdmin(); return B.lessonItemDel(subj, id); },
    async lessonStatus() { const u = await this.user(); if (!u) return { today: null }; return B.lessonStatus(u.id); },
    async lessonStart(subj, charId, msg) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.lessonStart(u.id, subj, charId, msg); },   // msg: 1등이 되면 랭킹 전광판에 흐를 한마디 (40자)
    async lessonAnswer(choice) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); dropBadges(); const r = await B.lessonAnswer(u.id, choice); if (r && r.result) drop('lrank:' + r.result.subj, 'lrank:all'); return r; },   // 끝나면 그 과목 랭킹은 새로
    async lessonNext() { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.lessonNext(u.id); },
    async lessonHint() { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.lessonHint(u.id); },
    // 사건 보드 스티커: 남의 쪽지에 붙이기 · 떼기 (규칙은 서버에서)
    async noteStickerAdd(noteId, url) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.noteStickerAdd(u.id, noteId, url); },
    async noteStickerDel(noteId, id) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.noteStickerDel(u.id, noteId, id); },
    // 관리자: 오늘 수업 기록 · 기회 돌려주기 (그 수업으로 바뀐 스탯 · 위로금까지 되돌려요)
    async adminLessonsToday() { await this.requireAdmin(); return B.adminLessonsToday(); },
    async adminLessonReset(id) { await this.requireAdmin(); dropBadges(); drop('lrank:kor', 'lrank:soc', 'lrank:mor', 'lrank:art', 'lrank:all'); return B.adminLessonReset(id); },
    // 빼빼로 증권
    async stockView() { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.stockView(u.id); },
    async stockJoin(charId) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.stockJoin(u.id, charId); },
    async stockTrade(charId, qty) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.stockTrade(u.id, charId, qty); },
    stockSub(cb) { return B.stockSub(cb); },
    async stockAdmin() { await this.requireAdmin(); return B.stockAdmin(); },
    async stockOpen(ends, cash) { await this.requireAdmin(); drop('settings'); cachedSettings = null; return B.stockOpen(ends, cash); },
    async stockClose() { await this.requireAdmin(); drop('settings'); cachedSettings = null; return B.stockClose(); },
    async stockPickNext(ids) { await this.requireAdmin(); return B.stockPickNext(ids); },
    async stockReward() { await this.requireAdmin(); return B.stockReward(); },
    async cheersToday() { const u = await this.user(); if (!u) return []; return remote ? hold('cheers', 12e4, () => B.cheersToday(u.id)) : B.cheersToday(u.id); },   // 수업 목록을 다시 그릴 때마다 묻지 않게 2분 기억
    async myGifts() { const u = await this.user(); if (!u) return []; return B.myGifts(u.id); },
    async openGift(id, pick) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); dropBadges(); return B.openGift(u.id, id, pick); },
    async adminGiftBox(charId) { await this.requireAdmin(); const u = await this.user(); return B.adminGiftBox(u.id, u.nickname, charId); },
    POUCH_DAY, MATCH,
    async matchStatus() { const u = await this.user(); if (!u) return { canPlay: false }; const p = await this.playOpen('match'); if (!p.open) return { canPlay: false, closed: true }; return B.matchStatus(u.id); },
    async matchRooms() { const u = await this.user(); if (!u) return []; return B.matchRooms(u.id); },
    async matchOpen(game, bet, msg) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.matchOpen(u.id, game, bet, msg); },
    async matchCancel(id) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.matchCancel(u.id, id); },
    async matchJoin(id, msg, bet) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.matchJoin(u.id, id, msg, bet); },
    async matchView(id) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); const r = await B.matchView(u.id, id); if (r && r.done) dropBadges(); return r; },
    async matchMove(id, action) { const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.'); return B.matchMove(u.id, id, action); },
    matchSub(id, cb) {
      if (remote) return B.matchSub(id, cb);
      const t = setInterval(() => { if (!document.hidden) cb(); }, 1100); return { ping() {}, stop() { clearInterval(t); } };
    },
    async lessonRank(subj) { const u = await this.user(); return remote ? hold('lrank:' + subj, 6e4, () => B.lessonRank(u && u.id, subj)) : B.lessonRank(u && u.id, subj); },   // 랭킹 탭을 오갈 때마다 묻지 않게 1분 기억 (내 수업이 끝나면 바로 새로)

    isPublic: r => !!(r && r.published_at),
    /* 공개 목록: 게시된 캐릭터만 (게시본 기준) */
    async list(t) {
      const rows = await B.list(t);
      return t === 'characters' ? rows.filter(r => r.published_at) : rows;
    },
    /* 이름 · 색만 담은 가벼운 목록 (게시된 캐릭터만) */
    async charNames() { return hold('names', 3e5, async () => (await B.charNames()).filter(r => r.published_at)); },
    get: (t, id) => B.get(t, id),
    async charCards() { return remote ? hold('cards', 3e5, () => B.charCards()) : this.list('characters'); },
    async charsRelatedTo(id) { return remote ? hold('rel:' + id, 3e5, () => B.charsRelatedTo(id)) : []; },
    async myCharacters() {
      const u = await this.user(); if (!u) return [];
      return remote ? B.myCharacters(u.id) : (await B.list('characters')).filter(r => r.owner_id === u.id);
    },
    async myCharacterNews() {
      const u = await this.user(); if (!u) return [];
      return remote ? hold('news:' + u.id, 3e5, () => B.myCharacterNews(u.id)) : this.myCharacters();
    },
    async adminCharacters() {
      await this.requireStaff(); const rows = await B.list('characters');
      return (await this.isAdmin()) ? rows : rows.filter(c => c.published_at || c.status === 'submitted');   // 부관리자: 게시된 것 + 심사 대기만
    },

    /* 작성본 저장 (언제나). 새 캐릭터면 만들어요. 제출·반려 상태였다면 다시 "작성 중"으로 */
    async saveDraft(id, draft) {
      const u = await this.user(); if (!u) throw new Error('로그인이 필요해요.');
      const admin = u.grade === 'admin';
      // 위험도 · 위험 등급 · 스킬 레벨은 관리자만 (회원이 저장하면 전에 있던 값 그대로 · 서버도 똑같이 막아요)
      const keepAdminOnly = (d, prev) => { prev = prev || {}; const lvOf = n => ((prev.skills || []).find(s => s && s.name === n) || {}).lv || '';
        return Object.assign({}, d, { danger: prev.danger == null ? '' : prev.danger, rank: prev.rank || '', skills: (d.skills || []).map(s => Object.assign({}, s, { lv: lvOf(s.name) })) }); };
      if (!id) {
        const c = await this.can('save', null); if (!c.ok) throw new Error(c.reason);   // 등록을 잠그면 새 캐릭터를 못 만들어요
        if (!admin) draft = keepAdminOnly(draft, {});
        const r = await B.insert('characters', { owner_id: u.id, author: u.nickname, data: {}, draft, status: 'draft', published_at: null, submitted_at: null, review_note: '' });
        return r;
      }
      const row = await B.get('characters', id);
      const c = await this.can('save', row); if (!c.ok) throw new Error(c.reason);
      // 한 번 게시된 캐릭터의 스탯은 관리자만 바꿔요 (작성 중으로 돌아가도 게시 때 스탯 그대로 · 서버도 똑같이 막아요)
      if (!admin && row.data && Object.keys(row.data).length) draft = Object.assign({}, draft, { stats: row.data.stats || '' });
      if (!admin) draft = keepAdminOnly(draft, row.draft || row.data);
      const patch = { draft, updated_at: now() };
      // 회원이 고치면 '작성 중'으로 · 관리자가 심사 대기 프로필을 고치면 심사 대기 그대로 (반려 버튼으로만 반려)
      if (row.status !== 'draft' && !row.published_at && !(admin && row.status === 'submitted')) patch.status = 'draft';   // 게시된 프로필은 고쳐도 '작성 중'이 되지 않아요
      const r = await B.update('characters', id, patch);
      return r;
    },
    async submit(id) {
      const u = await this.user(); const row = await B.get('characters', id);
      if (!row.draft) throw new Error('제출할 작성본이 없어요.');
      const c = await this.can('submit', row); if (!c.ok) throw new Error(c.reason);
      // 게시된 프로필: 수정 기간에 제출하면 심사 없이 바로 게시본에 반영돼요 (서버에서 기간 · 잠긴 값을 다시 확인)
      if (row.published_at && row.status !== 'submitted') {
        if (remote) await B.submitLive(id);
        else await B.update('characters', id, { data: Object.assign({}, row.draft, { stats: (row.data || {}).stats || '' }), draft: null, status: 'published', review_note: '', updated_at: now() });
        dropChars(); return { live: true };
      }
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
      await this.requireStaff();
      if (!(await this.isAdmin())) return B.staffReview(id, 'publish');
      const u = await this.user(); const row = await B.get('characters', id);
      const data = row.draft || row.data; dropChars();
      const r = await B.update('characters', id, { data, draft: null, status: 'published', published_at: now(), review_note: '', updated_at: now() });
      return r;
    },
    /* 레스트: 게시된 프로필 전체를 멤버란에서 내려요 · 내용은 작성본으로 옮겨져요 · 스탯은 계속 잠겨 있어요 */
    async restAll() {
      await this.requireAdmin(); dropChars();
      if (remote) return B.restAll();
      const rows = (await B.list('characters')).filter(c => c.published_at);
      for (const c of rows) await B.update('characters', c.id, { status: 'draft', draft: c.draft || c.data, published_at: null, submitted_at: null, review_note: '' });
      return rows.length;
    },
    /* 한 명만 내리기: 레스트와 같아요 (내용은 작성본으로 · 스탯은 계속 잠겨요 · 수정 기간에 다시 제출) */
    async restOne(id) {
      await this.requireAdmin(); dropChars(); drop('rel:' + id);
      const c = await B.get('characters', id); if (!c || !c.published_at) throw new Error('게시된 캐릭터가 아니에요.');
      return B.update('characters', id, { status: 'draft', draft: c.draft || c.data, published_at: null, submitted_at: null, review_note: '' });
    },
    async reject(id, note) {
      await this.requireStaff();
      if (!(await this.isAdmin())) return B.staffReview(id, 'reject', note);
      const u = await this.user(); const row = await B.get('characters', id);
      // 반려 = '작성 중'으로 돌려보내기 (본인 · 관리자만 보여요) · 게시 해제 + 게시본을 작성본으로 옮겨서 바로 고칠 수 있게
      // review_note 는 회원에게 보이지 않는 반려 표시 → 기간과 상관없이 다시 제출할 수 있어요 (게시하면 지워져요)
      const memo = String(note || '').trim().slice(0, 300) || '반려'; dropChars();
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
        await B.remove(t, id); dropChars();
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

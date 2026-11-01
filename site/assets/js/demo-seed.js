/* ================================================================
   데모 모드 예시 데이터 — 브라우저 저장 공간이 비어 있을 때만 한 번 채워요.
   · Supabase 를 연결하면 실행되지 않아요.
   · 실제 사이트에 필요 없으면 이 파일을 지워도 돼요.
   · 테스트 계정 비밀번호는 모두 test1234 (데모 전용)
   ================================================================ */
window.demoSeed = async function () {
  const P = 'naru:';
  const set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const id = () => crypto.randomUUID();
  const ago = h => new Date(Date.now() - h * 36e5).toISOString();
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const PW = 'test1234';

  const U = async (username, nickname, o) => Object.assign({ id: id(), username, nickname, contact: '', grade: 'member', approval: 'approved',
    title: '', role: '', seal: '', bio: '', pw: await sha(username + ':' + PW), created_at: ago(400) }, o);
  const admin = await U('tester', '테스트기록자', { grade: 'admin', title: 'Keeper of Seals', role: '天師', seal: '紅', bio: '이 기록소의 첫 번째 기록자.', created_at: ago(500) });
  const red = await U('redlotus', '적련', { title: 'Crimson Lotus', seal: '蓮', bio: '홍무당 캐릭터 전문.', created_at: ago(300) });
  const moon = await U('wolha', '월하', { title: 'Moonlit Exorcist', seal: '月', bio: '달빛 아래에서만 부적을 쓴다.', created_at: ago(250) });
  const cat = await U('heukmyo', '흑묘', { title: 'Night Archivist', seal: '貓', created_at: ago(200) });
  const p1 = await U('newbie01', '신입', { approval: 'pending', contact: '아무거나', created_at: ago(2) });
  const p2 = await U('yuna', '유나', { approval: 'pending', contact: 'yuna@whatever', created_at: ago(1) });
  set('users', [admin, red, moon, cat, p1, p2]);

  const C = (owner, data, o) => Object.assign({ id: id(), owner_id: owner.id, author: owner.nickname, data, draft: null, status: 'published',
    published_at: ago(100), submitted_at: null, review_note: '', created_at: ago(120), updated_at: ago(100) }, o);
  const rei = C(admin, { name: '예시 인물', name_en: 'Sample', team: '瑞門', rank: 'A', element: 'water', color: '#d0141c',
    quote: '데모 화면을 보여 주려고 넣은 예시 인물이에요.',
    song: { title: '', artist: '', url: '', cover: '' },
    ability: { name: '예시 능력', sub: '', desc: '예시 능력 설명이에요.' }, danger: 50,
    skills: [{ name: '예시 스킬 하나', lv: '3', desc: '예시 스킬 설명이에요.' }, { name: '예시 스킬 둘', lv: '6', desc: '예시 스킬 설명이에요.' }],
    stats: '근력: 50\n지력: 50\n이성: 50\n술력: 50\n외모: 50\n재력: 50\n행운: 50', persona: '예시 성격 설명이에요.',
    profile: '나이: 20\n키: 170cm',
    items: [{ name: '예시 소지품', desc: '예시 소지품 설명이에요.', img: '', rel: '' }, { name: '선물 받은 예시 소지품', desc: '예시 소지품 설명이에요.', img: '', rel: '' }] }, { created_at: ago(150) });
  const hongData = { name: '홍연', name_en: 'Hongyeon', subtitle: 'Crimson Veil', org: '紅巫堂', team: '誓門', rank: 'A+', element: 'fire', color: '#d4351c', quote: '신을 모시지만 신을 믿지는 않는다.' };
  const hong = C(red, hongData, { status: 'submitted', submitted_at: ago(1), draft: Object.assign({}, hongData, { quote: '신을 모시지만, 이제는 신을 믿어 보려 한다.', rank: 'S-' }) });
  const bae = C(admin, { name: '백야', name_en: 'Baekya', team: '瑞門', rank: 'A', element: 'metal', color: '#c8161d', classline: 'SENTINEL', quote: '밤이 하얗게 새도록 칼을 닦는 사람.' });
  const che = C(moon, { name: '청명', name_en: 'Cheongmyeong', team: '染', rank: 'B+', element: 'wood', color: '#2f8f6a', classline: 'GUIDE', quote: '맑은 날에만 웃는다.' });
  // 관계 + 휴대폰 알림 (예시 인물의 휴대폰에 뜸)
  rei.data.items[1].rel = hong.id;
  hong.data.related = [{ id: rei.id, msgType: 'imessage', msg: '예시 메시지예요.' }];
  hong.draft.related = hong.data.related;
  bae.data.related = [{ id: rei.id, msgType: 'sms', msg: '예시 문자예요.' }];
  che.data.related = [{ id: rei.id, msgType: 'missed', missed: '3', time: '어제' }];
  rei.data.related = [{ id: hong.id }, { id: bae.id }, { id: che.id }];
  // 심사 테스트용
  const D = (owner, data, status, o) => C(owner, {}, Object.assign({ draft: data, status, published_at: null, submitted_at: status === 'submitted' ? ago(2) : null }, o));
  const list = [rei, hong, bae, che,
    D(red, { name: '연화', name_en: 'Yeonhwa', org: '紅巫堂', team: '誓門', rank: 'A', element: 'fire', color: '#d4351c', quote: '불 속에서 피어난 연꽃.' }, 'submitted'),
    D(moon, { name: '소월', name_en: 'Sowol', org: '天師監', team: '染', rank: 'B', element: 'yin', color: '#b01822', quote: '달이 지면 사라지는 퇴마사.' }, 'submitted'),
    D(cat, { name: '흑야', name_en: 'Heukya', team: '染', rank: 'C+', element: 'earth', color: '#7a1016', quote: '밤에만 말을 하는 고양이 요괴.' }, 'draft', { review_note: '반려', published_at: null }),
    D(moon, { name: '월영', name_en: 'Wolyeong', quote: '(작성 중)' }, 'draft')];
  set('t:characters', list);

  const N = (owner, o, h) => Object.assign({ id: id(), owner_id: owner.id, author: owner.nickname, related_char: null, created_at: ago(h) }, o);
  set('t:npcs', [
    N(admin, { name: '월향', title: 'Mistress of the Moon Tower', role: '樓主', seal: '香', faction: '홍등가', bio: '월향루의 주인. 백 년째 같은 손님을 받고 있다는 소문이 있다.' }, 10),
    N(moon, { name: '흑월', title: 'Night Patrol Chief', role: '巡羅', seal: '黑', faction: '야순청', bio: '야순청 순라대장. 붉은 실 사건판을 처음 세운 사람.', related_char: rei.id }, 30),
    N(red, { name: '저울의 노인', title: 'Keeper of Scales', role: '商人', seal: '秤', faction: '귀시 상단', bio: '자정의 장터에서 무엇이든 무게를 단다. 값은 언제나 이름으로 받는다.' }, 50)]);

  const note = (owner, o, h) => Object.assign({ id: id(), owner_id: owner.id, author: owner.nickname, character_id: null, created_at: ago(h) }, o);
  const n1 = note(admin, { title: '3번 다리 목격자', body: '새벽 3시\n붉은 우산을 든 사람', color: 'fu', x: 1000, y: 560, rot: -3 }, 40);
  const n2 = note(red, { title: '천사감 서고', body: '247-B 진명첩 실종\n열람 기록 없음??', color: 'white', x: 1350, y: 640, rot: 2.5 }, 30);
  const n3 = note(moon, { title: '', body: '사건 당일 알리바이 없음', color: 'white', character_id: rei.id, x: 1180, y: 900, rot: -1.5 }, 20);
  const n4 = note(cat, { title: '귀시 상단', body: '잉크병 거래 장부', color: 'red', x: 760, y: 860, rot: 4 }, 10);
  set('t:notes', [n1, n2, n3, n4]);
  const L = (owner, a, b) => ({ id: id(), owner_id: owner.id, author: owner.nickname, from_id: a.id, to_id: b.id, created_at: ago(5) });
  set('t:links', [L(admin, n1, n2), L(admin, n1, n3), L(red, n2, n3), L(cat, n4, n3)]);
  set('t:teles', [{ id: id(), owner_id: red.id, author: red.nickname, to_user: admin.id, from_char: hong.id, to_char: rei.id, body: '…아직 살아 있구나. 다행이야.', read: false, created_at: ago(.5) }]);
};

window.demoLessonSeed = function () {
  const P = 'naru:', get = (k, d) => { try { return JSON.parse(localStorage.getItem(P + k)) || d; } catch (e) { return d; } };
  const set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const users = get('users', []), chars = get('t:characters', []), by = u => users.find(x => x.username === u) || users[0];
  const ago = h => new Date(Date.now() - h * 36e5).toISOString();
  const st = '근력: 50\n지력: 50\n이성: 50\n술력: 50\n외모: 50\n재력: 50\n행운: 50';
  const add = (u, d) => { const o = by(u); const c = { id: crypto.randomUUID(), owner_id: o.id, author: o.nickname, data: Object.assign({ stats: st }, d), draft: null, status: 'published', published_at: ago(90), submitted_at: null, review_note: '', created_at: ago(95), updated_at: ago(90) }; chars.push(c); return c; };
  if (!chars.some(c => c.data && c.data.name === '은설')) {
    add('redlotus', { name: '은설', team: '誓門', color: '#8fb8d8', quote: '눈이 오면 아무 말도 하지 않는다.', ability: { name: '빙결' }, items: [{ name: '은방울' }] });
    add('wolha', { name: '묵향', team: '瑞門', color: '#5a4a7a', quote: '먹 냄새가 나면 내가 지나간 거야.', ability: { name: '서부(書符)' }, items: [{ name: '낡은 붓' }] });
    add('heukmyo', { name: '단영', team: '染', color: '#c0392b', quote: '붉은 실은 끊어도 다시 이어진다.', ability: { name: '홍사' }, items: [{ name: '실패' }] });
  }
  chars.forEach(c => { if (c.published_at && c.data && !c.data.stats) c.data.stats = st; });
  // 수배서 문제 종류(전신 · 소지품 사진 · 성격 · 테마곡)를 다 볼 수 있게 예시 내용 채우기
  const pic = (s, w, h) => `https://picsum.photos/seed/samsara-${s}/${w}/${h}`, song = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const fill = (n, o) => { const c = chars.find(x => x.data && x.data.name === n); if (c) Object.keys(o).forEach(k => { if (!c.data[k] || (Array.isArray(c.data[k]) && !c.data[k].some(i => i.img || i.url))) c.data[k] = o[k]; }); };
  fill('은설', { persona: '(예시) 말수가 적고 추위를 타지 않는다. 눈 오는 날엔 하루 종일 창가에 앉아 있다. 은설은 화가 나면 오히려 웃는다.', images: [{ url: pic('eunseol-body', 600, 900), label: '원본' }], items: [{ name: '은방울', img: pic('bell', 400, 400), desc: '' }], song: { title: '(예시) 테마곡', artist: '예시 가수', url: song, cover: '' } });
  fill('묵향', { persona: '(예시) 늘 먹 냄새를 풍긴다. 글씨를 쓸 때만 말이 많아진다. 남의 부적을 고쳐 주는 게 취미다.', images: [{ url: pic('mukhyang-body', 600, 900), label: '원본' }], items: [{ name: '낡은 붓', img: pic('brush', 400, 400), desc: '' }] });
  fill('단영', { persona: '(예시) 장부와 숫자에 밝다. 붉은 실 한 타래를 늘 손목에 감고 다닌다. 거래는 웃으면서 한다.', items: [{ name: '실패', img: pic('thread', 400, 400), desc: '' }], song: { title: '(예시) 붉은 실', artist: '예시 가수', url: song, cover: '' } });
  // 두상 시험용 움짤 (국어 두상 문제 · 도덕심 시봉 화면)
  chars.forEach(c => { if (c.published_at && c.data && !c.data.head) c.data.head = 'https://i.imgur.com/r92zioK.gif'; });
  // 특전 · 응원 쪽지 시험용 (데모 계정 tester 의 첫 캐릭터): 행운 · 재력을 평균보다 크게 → 힌트 · 다시 하기 · 출석/고양이 영전 · 스탯 보정이 보여요
  const me = by('tester'), mineC = chars.find(c => c.owner_id === me.id && c.published_at);
  if (mineC) {
    const ws = get('t:wallets', {}), w = ws[me.id] = Object.assign({ coins: 0, items: [], equip: {}, tickets: {}, boosts: {} }, ws[me.id] || {});
    w.boosts = Object.assign({}, w.boosts, { [mineC.id]: Object.assign({}, (w.boosts || {})[mineC.id], { 행운: 25, 재력: 25, 지력: 10, 이성: 16, 근력: 6 }) }); set('t:wallets', ws);
  }
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  set('t:cheers', [
    { id: crypto.randomUUID(), to_user: me.id, kind: 'pencil', msg: '(예시) 오늘 수업 甲 받자! 너라면 할 수 있어 ✦', day: today, created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), to_user: me.id, kind: 'sharp', msg: '(예시) 문자 답장은 천천히, 침착하게. 틀려도 괜찮아.', day: today, created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), to_user: me.id, kind: 'eraser', msg: '(예시) 실수는 내가 다 지워 줄게 ♡ 오늘도 파이팅!', day: today, created_at: new Date().toISOString() }]);
  localStorage.setItem(P + 'lesson_v', '4');
  set('t:characters', chars);
  const S = (house, from, msg, a, b, c, scold) => ({ house, from, msg, opts: [a, b, c], scold });
  set('t:lesson_soc', [
    S('본가', '큰어머니', '(예시) 오늘 제사 준비는 다 끝났느냐.', '네, 제기까지 다 닦아 두었습니다.', 'ㅇㅇ 대충 함', '그걸 왜 저한테 물어보세요?', '어른이 물으면 바로 답하는 게 도리다.'),
    S('본가', '큰아버지', '(예시) 내일 아침 일찍 사당에 들르거라.', '해 뜨기 전에 찾아뵙겠습니다.', '몇 시까지요? 늦잠 잘 건데', '바빠서 못 가요~', '대답이 늦구나.'),
    S('본가', '할머니', '(예시) 밥은 먹고 다니느냐.', '네, 할머니. 꼭 챙겨 먹고 있습니다.', '아뇨 귀찮아서', '그건 알아서 할게요', ''),
    S('본가', '고모', '(예시) 이번 명절엔 누구랑 오니.', '혼자 가서 일손 돕겠습니다.', '안 갈 수도 있어요', '그건 비밀이에요 ㅋㅋ', ''),
    S('본가', '큰어머니', '(예시) 부적 접는 법은 다 익혔느냐.', '다 익혔습니다. 보여 드릴까요?', '유튜브 보면 돼요', '그거 꼭 해야 돼요?', ''),
    S('경파', '숙부', '(예시) 오늘 수련은 몇 시간 했나.', '네 시간 채웠습니다.', '오늘은 쉬었어요', '수련 그거 꼭 해야 됨?', '답이 느리다. 칼도 그리 느리냐.'),
    S('경파', '사형', '(예시) 맹세는 잊지 않았겠지.', '하루도 잊은 적 없습니다.', '무슨 맹세요?', '기억 안 나는데요', ''),
    S('경파', '어머니', '(예시) 다친 데는 없니.', '조금 긁혔지만 괜찮습니다.', '몰라요', '엄마가 알아서 뭐 해요', ''),
    S('경파', '숙부', '(예시) 문파 모임에 늦지 마라.', '먼저 가서 자리 정리해 두겠습니다.', '늦을 수도 있어요', '안 가면 안 돼요?', ''),
    S('경파', '사부', '(예시) 검은 매일 닦고 있느냐.', '매일 밤 닦고 있습니다.', '가끔요', '검이 뭐예요?', ''),
    S('염가', '이모', '(예시) 이번 달 염료 장부 정리했니?', '어제 다 맞춰 두었어요.', '아직이요 ㅎㅎ', '그걸 제가 왜 해요', '장부는 미루는 게 아니다.'),
    S('염가', '외삼촌', '(예시) 붉은 실 거래처에 인사는 드렸고?', '선물까지 챙겨서 다녀왔어요.', '깜빡했어요', '거래처가 어디였죠?', ''),
    S('염가', '어머니', '(예시) 오늘 가게 문은 누가 열었니.', '제가 일찍 나와서 열었어요.', '몰라요 자고 있었어요', '알바생이요', ''),
    S('염가', '이모', '(예시) 손님한테 웃으면서 인사했지?', '네, 단골 손님 이름도 외웠어요.', '귀찮아서 안 했어요', '웃는 게 돈이 돼요?', ''),
    S('염가', '외삼촌', '(예시) 실 염색 온도는 지켰니.', '정확히 맞췄어요.', '대충 했어요', '온도요? 그런 게 있어요?', ''),
    S('염업', '대행수', '(예시) 오늘 납품은 끝났나.', '오전에 모두 넘겼습니다.', '내일 할게요', '그건 제 일이 아닌데요', '대답이 늦으면 거래도 늦는다.'),
    S('염업', '부행수', '(예시) 장부 숫자가 하나 틀리던데.', '바로 다시 맞춰 보겠습니다.', '그럴 리가요', '누가 틀렸는지 모르겠어요', ''),
    S('염업', '대행수', '(예시) 새 거래처 사람은 믿을 만하더냐.', '사흘 더 지켜보고 말씀드리겠습니다.', '좋은 사람 같던데요', '몰라요', ''),
    S('염업', '선배', '(예시) 점심은 먹었나.', '먹었습니다. 선배님은요?', '아뇨', '왜요?', ''),
    S('염업', '대행수', '(예시) 오늘 밤 회합에 참석하게.', '시간 맞춰 가겠습니다.', '피곤한데요', '안 가도 되죠?', '')]);
  const named = n => chars.find(c => c.data && c.data.name === n);
  const M = (n, line, a, b, c, ra, rb, rc) => named(n) ? { char_id: named(n).id, line, opts: [a, b, c], react: [ra, rb, rc] } : null;
  set('t:lesson_mor', [
    M('은설', '(예시) 손이 시린데 차 한 잔만 줄래? 너무 뜨겁지 않게.', '미지근하게 식힌 국화차를 두 손으로 건넨다', '펄펄 끓는 물을 바로 따라 준다', '"직접 하세요"라고 말한다', '…따뜻하네. 고마워.', '앗 뜨거…!', '…그래.'),
    M('은설', '(예시) 눈이 와서 길이 미끄러워.', '먼저 앞장서서 길을 살핀다', '뒤에서 웃으며 구경한다', '혼자 먼저 가 버린다', '…천천히 가자.', '재밌니?', ''),
    M('은설', '(예시) 머리끈이 끊어졌어.', '가지고 있던 끈을 내민다', '그냥 풀고 다니라고 한다', '못 본 척한다', '고마워. 돌려줄게.', '…', ''),
    M('은설', '(예시) 오늘은 말하기 싫어.', '조용히 옆에 앉아 있는다', '계속 말을 건다', '왜 그러냐고 따진다', '…', '조용히 좀.', ''),
    M('은설', '(예시) 은방울이 안 울려.', '방울을 조심히 닦아 준다', '흔들어서 고쳐 본다', '새로 사라고 한다', '…울린다.', '깨지겠어.', ''),
    M('묵향', '(예시) 먹이 다 떨어졌어. 갈아 줄래?', '천천히 고르게 먹을 간다', '물을 잔뜩 붓는다', '"먹물 사서 쓰세요"', '좋은 향이야.', '이건 물이잖아.', ''),
    M('묵향', '(예시) 붓을 어디 뒀는지 모르겠어.', '책상 위를 차근차근 찾아 준다', '새 붓을 꺼내 준다', '"알아서 찾으세요"', '찾았다. 고마워.', '이건 내 붓이 아니야.', ''),
    M('묵향', '(예시) 부적을 말려야 해.', '바람 잘 드는 그늘에 펴 둔다', '햇볕에 바짝 내놓는다', '접어서 서랍에 넣는다', '잘했어.', '글씨가 바랬잖아.', ''),
    M('묵향', '(예시) 오늘 쓴 글 좀 봐 줄래?', '천천히 읽고 좋은 점을 말한다', '틀린 글자만 찾아 말한다', '안 읽고 좋다고 한다', '고마워.', '…그래.', ''),
    M('묵향', '(예시) 졸려.', '담요를 덮어 준다', '찬물을 끼얹는다', '깨워서 계속 쓰게 한다', '…조금만 잘게.', '!!!', ''),
    M('단영', '(예시) 실이 엉켰어. 좀 풀어 줘.', '끝을 찾아 차근차근 푼다', '가위로 잘라 버린다', '더 엉키게 잡아당긴다', '역시 손이 좋네.', '…그걸 자르면 어떡해.', ''),
    M('단영', '(예시) 손님이 오면 차부터 내 줘.', '찻잔을 데워 두고 기다린다', '손님이 오면 그때 생각한다', '"제가요?"라고 한다', '좋아.', '', ''),
    M('단영', '(예시) 오늘 장부 좀 같이 보자.', '숫자를 한 줄씩 짚으며 맞춘다', '대충 훑어본다', '계산기를 던져 준다', '꼼꼼하네.', '', ''),
    M('단영', '(예시) 붉은 실 한 타래만 가져와.', '색을 확인하고 가져온다', '아무 실이나 가져온다', '"어디 있는데요?"', '이 색 맞아.', '이건 분홍이잖아.', ''),
    M('단영', '(예시) 비 오는데 우산 있어?', '우산을 씌워 준다', '혼자 쓰고 간다', '비 맞으면 시원하다고 한다', '…같이 쓰자.', '', '')].filter(Boolean));
};

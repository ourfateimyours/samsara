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

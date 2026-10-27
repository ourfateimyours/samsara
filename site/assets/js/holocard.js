/* ================================================================
   홀로그램 카드 (메인 화면 영전 순위 카드)
   셰이더(무지개 박 · 쓸고 지나가는 빛 · 보로노이 별빛 · 시차)는 Holo Card Studio 의 웹 템플릿에서 가져왔어요.
   https://github.com/EverettFish/holo-card-studio  (assets/web-template/app.js)

   MIT License
   Copyright (c) 2026 Holo Card Studio contributors
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
   permit persons to whom the Software is furnished to do so, subject to the following conditions:
   The above copyright notice and this permission notice shall be included in all copies or substantial portions of
   the Software.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
   WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
   COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
   OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

   여기서 바꾼 점: Three.js · Blender 모델 · 블룸 없이 WebGL 사각형 하나에 그려요.
   두상 = 주체층(tSubject), 배경층 대신 투명한 유리(캐릭터 색이 옅게 비쳐요), 글자는 카드 위 HTML 로 얹어요.
   쓰는 법: HoloCard.attach(카드 요소, { img, color })  → WebGL 이 안 되면 false (CSS 카드가 그대로 보여요)
   ================================================================ */
(function () {
  const vertex = `attribute vec2 p; varying vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
  const shared = `precision highp float;
varying vec2 vUv;
uniform float uTime,uFoil,uScale,uDepth,uBgDepth,uStar;
uniform vec3 uView;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 spectrum(float t){t=fract(t);vec3 pink=vec3(1.,.32,.62),yellow=vec3(1.,.85,.32),blue=vec3(.22,.62,1.);if(t<.35)return mix(pink,yellow,t/.35);if(t<.7)return mix(yellow,blue,(t-.35)/.35);return mix(blue,vec3(1.),(t-.7)/.3);}
vec3 overlay(vec3 b,vec3 f){return mix(2.*b*f,1.-2.*(1.-b)*(1.-f),step(vec3(.5),b));}
float inside(vec2 p){return step(0.,p.x)*step(0.,p.y)*step(p.x,1.)*step(p.y,1.);}
vec2 parallax(vec2 p,float s,float d){return (p-.5)*s+.5+uView.xy/max(abs(uView.z),.35)*d*.14;}
float wave(vec2 p){vec2 a=p+uView.xy*2.4;return .5+.5*sin((a.x*.848-a.y*.530)*6.283*.55+7.*noise(a*1.5));}
float star(vec2 p){vec2 q=p*uStar,id=floor(q),f=fract(q);float first=9.,second=9.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(id+g),hash(id+g+43.3));float d=length(g+o-f);if(d<first){second=first;first=d;}else second=min(second,d);}}float edge=1.-smoothstep(.01,.035,second-first);float sparse=step(.90,hash(id+8.8));float twinkle=pow(.5+.5*sin(uTime*1.8+hash(id)*30.+uView.x*27.+uView.y*21.),6.);return edge*sparse*twinkle;}
`;
  const fragment = shared + `
uniform sampler2D tSubject; uniform vec3 uTint;
void main(){
 vec2 uv=vUv;
 vec2 su=parallax(uv,uScale,uDepth);
 vec2 bu=parallax(uv,1.,uBgDepth);
 vec4 sub=texture2D(tSubject,clamp(su,0.,1.));sub.a*=inside(su);
 // 유리 카드: 두상은 위쪽이 꽉 차고, 아래로 갈수록 유리처럼 투명해져요
 float melt=1.-smoothstep(.42,1.,uv.y);
 float m=sub.a*melt;
 float w=wave(uv); vec3 foil=mix(spectrum(w*.8+noise(uv*5.)*.12),vec3(1.),.45);   // 파스텔: 무지개에 흰색을 섞어 채도를 낮춰요
 vec3 subject=mix(sub.rgb,overlay(sub.rgb,foil),uFoil*.28);
 // 유리: 캐릭터 색이 아주 옅게 비치기만 (홀로그램은 두상에만 — 바깥은 깨끗하게)
 vec3 glass=mix(uTint,vec3(1.),.45)*(.65+.35*(1.-uv.y));   // 유리: 캐릭터 색이 옅게 비쳐요 (위쪽이 조금 더 밝게)
 float ga=.12+.08*(1.-uv.y);
 vec3 col=mix(glass,subject,m); float a=mix(ga,1.,m);
 float sweep=pow(max(0.,sin((uv.x*.83+uv.y*.35+uView.x*1.8+uView.y*.9)*6.283)),12.);
 col+=foil*sweep*uFoil*.4*m; a=max(a,sweep*uFoil*.3*m);
 // 별빛 두 겹 (원본 보로노이 별)
 float s1=star(bu)*.81*m, s2=star(su*.63+.21)*.63*m;   // 별빛은 예전 세기 그대로 (박 세기와 따로)
 col+=(vec3(.66,.86,1.)*s1+vec3(1.,.95,.85)*s2)*1.4; a=max(a,max(s1,s2));   // 별빛만 블룸처럼 더 밝게
 // 유리 광택: 비스듬한 빛줄기 하나가 기울기를 따라 미끄러져요 (은은하게)
 float d=uv.x*.6+uv.y*.4-.2-uView.x*.3; float gloss=smoothstep(0.,.02,d)*(1.-smoothstep(.02,.12,d));
 col+=vec3(1.)*gloss*.05; a=max(a,gloss*.04);   // 위쪽 반사빛은 거의 안 보이게
 // 테두리: 얇은 유리 빛 한 줄 (캐릭터 색)
 vec2 e=abs(uv-.5)*2.; float rim=smoothstep(.955,.995,max(e.x,e.y*1.01));
 col=mix(col,mix(uTint,vec3(1.),.6),rim*.6); a=mix(a,.9,rim*.6);
 gl_FragColor=vec4(clamp(col,0.,1.),clamp(a,0.,1.));   // 두상 색은 그대로 (밝게 날리지 않게)
}`;  const PRM = { foil: .55, subjectScale: 1.08, subjectDepth: .4, backgroundDepth: -.25 };   // 박은 원본(.65)보다 세게 — 작은 카드라 잘 보이도록
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gl = null, prog = null, U = {}, canvas = null, texSub = null, card = null, raf = 0;
  let rx = .025, ry = -.13, tx = .025, ty = -.13, hover = false, last = 0, elapsed = 0, offscreen = false;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { offscreen = !e.isIntersecting; })) : null;

  function setup() {
    canvas = document.createElement('canvas'); canvas.className = 'hc-gl';
    gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vertex)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uTime', 'uFoil', 'uScale', 'uDepth', 'uBgDepth', 'uStar', 'uView', 'uTint', 'tSubject'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    gl.uniform1f(U.uFoil, PRM.foil); gl.uniform1f(U.uScale, PRM.subjectScale); gl.uniform1f(U.uDepth, PRM.subjectDepth); gl.uniform1f(U.uBgDepth, PRM.backgroundDepth);
    gl.uniform1i(U.tSubject, 0);
    texSub = gl.createTexture();
    return true;
  }
  function upload(tex, unit, source) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
  }
  // 주체층: 두상을 카드 비율에 꽉 차게 (위쪽 기준 · 가로세로 같은 배율이라 늘어나지 않아요)
  let subC = null, subX = null, nohead = false, token = 0, liveImg = null, liveAt = 0;
  function drawSub(src, iw, ih) {
    const W = subC.width, H = subC.height, zoom = nohead ? 1.6 : 1, s = Math.max(W / iw, H / ih) * zoom, dw = iw * s, dh = ih * s;
    subX.clearRect(0, 0, W, H); subX.drawImage(src, (W - dw) / 2, nohead ? -dh * .02 : (H - dh) * .14, dw, dh);
    upload(texSub, 0, subC);
  }
  /* 움짤(GIF 등): WebGL 은 그림의 첫 장면만 쓰니까, 장면을 하나씩 꺼내 매번 다시 올려요
     ImageDecoder 가 되는 브라우저는 장면마다 정확한 시간으로, 안 되면 화면에 숨겨 둔 <img> 를 계속 베껴 그려요 */
  // 미리 받아 두기: 랭킹 1 · 2 · 3 두상을 처음에 한 번에 받아 두면, 넘길 때 바로 나와요
  const cache = new Map();
  const getData = url => {
    if (!cache.has(url)) cache.set(url, fetch(url, { mode: 'cors' }).then(async res => {
      if (!res.ok) return null;
      const type = (res.headers.get('content-type') || '').split(';')[0] || (/\.gif(\?|$)/i.test(url) ? 'image/gif' : '');
      return { type, buf: await res.arrayBuffer() };
    }).catch(() => null));
    return cache.get(url);
  };
  const preload = urls => urls.filter(Boolean).forEach(u => { if (window.ImageDecoder) getData(u); else { const i = new Image(); i.crossOrigin = 'anonymous'; i.src = u; } });
  async function loadAnimated(url, my, el) {
    if (!window.ImageDecoder) return false;
    const got = await getData(url); if (!got) return false;
    const { type, buf } = got;
    if (!type || !(await ImageDecoder.isTypeSupported(type))) return false;
    const dec = new ImageDecoder({ data: buf.slice(0), type });
    await dec.tracks.ready; const n = dec.tracks.selectedTrack ? dec.tracks.selectedTrack.frameCount : 1;
    let i = 0;
    const step = async () => {
      if (my !== token || !el.isConnected) return dec.close();
      const { image } = await dec.decode({ frameIndex: i });
      if (my !== token) { image.close(); return dec.close(); }
      drawSub(image, image.displayWidth, image.displayHeight); el.classList.add('gl');
      const ms = Math.max(20, (image.duration || 100000) / 1000); image.close();
      if (n > 1 && !REDUCED) { i = (i + 1) % n; setTimeout(step, document.hidden || offscreen ? 500 : ms); }   // 안 보일 땐 천천히
    };
    await step();
    return true;
  }  function frame(now) {
    raf = 0; if (!card || !card.isConnected) return;
    // 가볍게: 초당 30번만 그리고, 카드가 화면 밖이면 쉬어요
    if (offscreen || now - last < 32) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min((now - last) / 1000, .1) || 0; last = now; if (!document.hidden) elapsed += dt;
    if (!hover && !REDUCED) { ty = Math.sin(elapsed * .65) * .38; tx = Math.sin(elapsed * .85) * .12; }
    const ease = REDUCED ? 1 : 1 - Math.exp(-dt * 8); rx += (tx - rx) * ease; ry += (ty - ry) * ease;
    card.style.setProperty('--rx', (rx * 57.3).toFixed(2) + 'deg'); card.style.setProperty('--ry', (ry * 57.3).toFixed(2) + 'deg');
    const vx = Math.sin(ry), vy = Math.sin(rx), vz = Math.cos(rx) * Math.cos(ry);
    gl.uniform3f(U.uView, vx, vy, vz); gl.uniform1f(U.uTime, REDUCED && !hover ? 0 : elapsed);
    if (liveImg && liveImg.isConnected && now - liveAt > 66) { liveAt = now; try { drawSub(liveImg, liveImg.naturalWidth, liveImg.naturalHeight); } catch (e) { liveImg = null; } }
    gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  }
  function attach(el, o) {
    try { if (!gl && !setup()) return false; } catch (e) { console.warn('holocard', e); gl = null; return false; }
    card = el; hover = false; if (io) { io.disconnect(); io.observe(el); }
    // 기울어진 상태의 화면 크기(getBoundingClientRect)가 아니라 본래 크기로 — 그래야 두상이 늘어나지 않아요
    const dpr = Math.min(devicePixelRatio || 1, 2) * 1.5;
    canvas.width = Math.max(2, Math.round(el.offsetWidth * dpr)); canvas.height = Math.max(2, Math.round(el.offsetHeight * dpr));
    gl.uniform1f(U.uStar, el.offsetWidth / 4.5);   // 별 크기를 화면 픽셀에 맞춰요 (원본 105칸은 큰 카드 기준)
    el.prepend(canvas); el.classList.add('gl');   // 바로 홀로그램 화면으로 (CSS 카드가 번쩍 보이지 않게)
    const hex = /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#c4b6ff';   // 유리에 비칠 캐릭터 색
    gl.uniform3f(U.uTint, ...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
    subC = document.createElement('canvas'); subC.width = canvas.width; subC.height = canvas.height; subX = subC.getContext('2d');
    nohead = !!o.nohead; const my = ++token; liveImg = null;
    const still = () => {   // 보통 그림 (또는 움짤을 장면별로 못 꺼낼 때)
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        try { drawSub(img, img.naturalWidth, img.naturalHeight); el.classList.add('gl'); } catch (e) { console.warn('holocard image', e); canvas.remove(); el.classList.remove('gl'); return; }
        if (/\.(gif|webp|apng)(\?|$)/i.test(o.img) && my === token) {   // 움짤이면 숨겨 둔 <img> 를 계속 베껴 그려요
          img.className = 'hc-live'; img.alt = ''; el.append(img); liveImg = img;
        }
      };
      img.onerror = () => { canvas.remove(); el.classList.remove('gl'); };
      img.src = o.img;
    };
    loadAnimated(o.img, my, el).then(ok => { if (!ok && my === token) still(); }).catch(() => { if (my === token) still(); });
    // 처음 한 번만 빈 주체층 (넘길 땐 새 그림이 올 때까지 앞 그림을 잠깐 둬요 — 뒤집히는 동안이라 안 보여요)
    if (!texReady) { upload(texSub, 0, (() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c; })()); texReady = true; }
    el.addEventListener('pointermove', e => {
      const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 2 - 1, y = (e.clientY - b.top) / b.height * 2 - 1;
      hover = true; ty = Math.max(-.65, Math.min(.65, x * .55)); tx = Math.max(-.43, Math.min(.43, -y * .38));
    });
    el.addEventListener('pointerleave', () => { hover = false; });
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    return true;
  }
  let texReady = false;
  window.HoloCard = { attach, preload };
})();

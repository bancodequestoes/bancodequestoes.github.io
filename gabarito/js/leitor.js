/* Leitura da folha a partir de uma foto ou de um quadro da câmera.
   1) acha os 4 quadrados pretos, 2) calcula a perspectiva (homografia),
   3) lê o QR code na posição esperada, 4) mede o preenchimento de cada bolinha. */

class ErroLeitura extends Error {
  constructor(codigo, msg) { super(msg); this.codigo = codigo; }
}

function cinza(rgba, w, h) {
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}

function reduzir(g, w, h, maxLado) {
  const k = Math.min(1, maxLado / Math.max(w, h));
  if (k === 1) return { g, w, h, k };
  const W = Math.round(w * k), H = Math.round(h * k), out = new Uint8ClampedArray(W * H);
  const inv = 1 / k;
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * inv), y1 = Math.min(h, Math.floor((y + 1) * inv));
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * inv), x1 = Math.min(w, Math.floor((x + 1) * inv));
      let s = 0, n = 0;
      for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++) for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) { s += g[yy * w + xx]; n++; }
      out[y * W + x] = s / n;
    }
  }
  return { g: out, w: W, h: H, k };
}

/* Encontra os 4 quadrados dos cantos. Devolve os centros na ordem horária a partir do mais acima-à-esquerda. */
function acharMarcas(g, w, h) {
  const W1 = w + 1, I = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) {
    let lin = 0;
    for (let x = 0; x < w; x++) { lin += g[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + lin; }
  }
  const R = Math.max(10, Math.round(Math.max(w, h) / 12));
  const bin = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - R), yb = Math.min(h, y + R + 1);
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - R), xb = Math.min(w, x + R + 1);
      const soma = I[yb * W1 + xb] - I[ya * W1 + xb] - I[yb * W1 + xa] + I[ya * W1 + xa];
      const media = soma / ((yb - ya) * (xb - xa));
      const v = g[y * w + x];
      if (v < media * 0.68 && v < 150) bin[y * w + x] = 1;
    }
  }
  // componentes conectados
  const lab = new Int32Array(w * h), pilha = new Int32Array(w * h);
  const cands = [];
  let id = 0;
  for (let i = 0; i < bin.length; i++) {
    if (!bin[i] || lab[i]) continue;
    id++;
    let sp = 0; pilha[sp++] = i; lab[i] = id;
    let area = 0, sx = 0, sy = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    while (sp) {
      const p = pilha[--sp], x = p % w, y = (p - x) / w;
      area++; sx += x; sy += y;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x > 0 && bin[p - 1] && !lab[p - 1]) { lab[p - 1] = id; pilha[sp++] = p - 1; }
      if (x < w - 1 && bin[p + 1] && !lab[p + 1]) { lab[p + 1] = id; pilha[sp++] = p + 1; }
      if (y > 0 && bin[p - w] && !lab[p - w]) { lab[p - w] = id; pilha[sp++] = p - w; }
      if (y < h - 1 && bin[p + w] && !lab[p + w]) { lab[p + w] = id; pilha[sp++] = p + w; }
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    if (bw < 6 || bh < 6) continue;
    const ar = bw / bh;
    if (ar < 0.5 || ar > 2) continue;
    if (area / (bw * bh) < 0.5) continue;
    if (bw > w * 0.2 || bh > h * 0.2) continue;
    cands.push({ x: sx / area, y: sy / area, area });
  }
  cands.sort((a, b) => b.area - a.area);
  const top = cands.slice(0, 12);
  let melhor = null, melhorScore = 0;
  const n = top.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
    const q = [top[a], top[b], top[c], top[d]];
    const areas = q.map((p) => p.area), mx = Math.max(...areas), mn = Math.min(...areas);
    if (mn < mx * 0.3) continue;
    const ord = ordenarHorario(q);
    if (!convexo(ord)) continue;
    const aq = areaPoligono(ord);
    if (aq < w * h * 0.12) continue;
    // lados opostos com tamanhos parecidos (folha retangular, perspectiva moderada)
    const L = [0, 1, 2, 3].map((i) => dist(ord[i], ord[(i + 1) % 4]));
    if (Math.min(L[0], L[2]) / Math.max(L[0], L[2]) < 0.6 || Math.min(L[1], L[3]) / Math.max(L[1], L[3]) < 0.6) continue;
    const score = aq * Math.sqrt(mn / mx);
    if (score > melhorScore) { melhorScore = score; melhor = ord; }
  }
  return melhor;
}
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
function ordenarHorario(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const ord = pts.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  // começa pelo mais acima-à-esquerda
  let k = 0, best = Infinity;
  ord.forEach((p, i) => { if (p.x + p.y < best) { best = p.x + p.y; k = i; } });
  return ord.slice(k).concat(ord.slice(0, k));
}
function convexo(p) {
  let sinal = 0;
  for (let i = 0; i < 4; i++) {
    const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const s = Math.sign(z);
    if (!s) return false;
    if (sinal && s !== sinal) return false;
    sinal = s;
  }
  return true;
}
function areaPoligono(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; }
  return Math.abs(s) / 2;
}

/* Homografia que leva (X,Y) em mm para (x,y) em pixels */
function homografia(src, dst) {
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const [X, Y] = src[i], { x, y } = dst[i];
    A.push([X, Y, 1, 0, 0, 0, -X * x, -Y * x]); B.push(x);
    A.push([0, 0, 0, X, Y, 1, -X * y, -Y * y]); B.push(y);
  }
  const h = resolver(A, B);
  if (!h) return null;
  return (X, Y) => {
    const d = h[6] * X + h[7] * Y + 1;
    return [(h[0] * X + h[1] * Y + h[2]) / d, (h[3] * X + h[4] * Y + h[5]) / d];
  };
}
function resolver(A, B) {
  const n = B.length, M = A.map((r, i) => [...r, B[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

function amostrador(g, w, h, H) {
  return (X, Y) => {
    const [x, y] = H(X, Y);
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 255;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return (g[i] * (1 - fx) + g[i + 1] * fx) * (1 - fy) + (g[i + w] * (1 - fx) + g[i + w + 1] * fx) * fy;
  };
}

/* Recorta a região do QR já "endireitada" e tenta decodificar */
function lerQRRetificado(g, w, h, H) {
  const s = 10, x0 = 157, y0 = 3.5, lado = 34, n = lado * s;
  const amostra = amostrador(g, w, h, H);
  const rgba = new Uint8ClampedArray(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = amostra(x0 + (i + 0.5) / s, y0 + (j + 0.5) / s), k = (j * n + i) * 4;
    rgba[k] = rgba[k + 1] = rgba[k + 2] = v; rgba[k + 3] = 255;
  }
  const r = jsQR(rgba, n, n, { inversionAttempts: "dontInvert" });
  return r && r.data;
}

function mediaDisco(amostra, cx, cy, raio) {
  let s = 0, n = 0;
  const passo = Math.max(0.25, raio / 3);
  for (let dy = -raio; dy <= raio + 1e-9; dy += passo) for (let dx = -raio; dx <= raio + 1e-9; dx += passo) {
    if (dx * dx + dy * dy > raio * raio) continue;
    s += amostra(cx + dx, cy + dy); n++;
  }
  return s / n;
}

/* Lê as bolinhas. Devolve string de respostas: letra, "-" (branco) ou "*" (mais de uma). */
function lerBolinhas(amostra, geo) {
  // referência de preto: interior dos quadrados dos cantos
  const pretos = MARCAS.centros.map(([x, y]) => mediaDisco(amostra, x, y, 2.5));
  const preto = pretos.sort((a, b) => a - b)[1];
  let resp = "";
  const fills = [];
  for (let q = 0; q < geo.nQ; q++) {
    // referência de branco: vãos entre as bolinhas da mesma linha
    const brancos = [];
    for (let a = 0; a < geo.nAlt; a++) {
      const [cx, cy] = geo.pos(q, a);
      brancos.push(mediaDisco(amostra, cx + geo.px / 2, cy, 0.25));
      if (a === 0) brancos.push(mediaDisco(amostra, cx - geo.px / 2, cy, 0.25));
    }
    brancos.sort((a, b) => b - a);
    const branco = brancos[Math.floor(brancos.length / 3)];
    const faixa = Math.max(40, branco - preto);
    const f = [];
    for (let a = 0; a < geo.nAlt; a++) {
      const [cx, cy] = geo.pos(q, a);
      let max = 0;
      const off = geo.r * 0.3;
      for (const dy of [-off, 0, off]) for (const dx of [-off, 0, off]) {
        const v = (branco - mediaDisco(amostra, cx + dx, cy + dy, geo.r * 0.55)) / faixa;
        if (v > max) max = v;
      }
      f.push(Math.min(1, max));
    }
    fills.push(f);
    const ord = f.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const [m1, i1] = ord[0], m2 = ord[1] ? ord[1][0] : 0;
    if (m1 < 0.35) resp += "-";
    else if (m2 >= 0.35 && m2 > m1 * 0.6) resp += "*";
    else resp += LETRAS[i1];
  }
  return { resp, fills };
}

/* Entrada: um canvas (foto ou quadro de vídeo). Saída: { codigo, info, resp, fills, H, previa } */
function lerFolha(canvas, opcoes = {}) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const g = cinza(rgba, w, h);
  const red = reduzir(g, w, h, 900);
  const marcas = acharMarcas(red.g, red.w, red.h);
  if (!marcas) throw new ErroLeitura("cantos", "Não encontrei os 4 quadrados pretos dos cantos. Fotografe a folha inteira, de cima, com boa luz.");
  const pts = marcas.map((p) => ({ x: (p.x + 0.5) / red.k - 0.5, y: (p.y + 0.5) / red.k - 0.5 }));

  // tenta as 4 orientações; a certa é a que tem o QR code no canto superior direito
  let codigo = null, H = null;
  for (const k of [0, 1, 3, 2]) {
    const dst = [0, 1, 2, 3].map((i) => pts[(i + k) % 4]);
    const Hk = homografia(MARCAS.centros, dst);
    if (!Hk) continue;
    const txt = lerQRRetificado(g, w, h, Hk);
    if (txt && lerCodigoQR(txt)) { codigo = txt; H = Hk; break; }
  }
  if (!codigo) {
    const r = jsQR(rgba, w, h, { inversionAttempts: "dontInvert" });
    if (r && lerCodigoQR(r.data)) {
      codigo = r.data;
      const c = r.location;
      const qc = { x: (c.topLeftCorner.x + c.bottomRightCorner.x) / 2, y: (c.topLeftCorner.y + c.bottomRightCorner.y) / 2 };
      let j = 0, best = Infinity;
      pts.forEach((p, i) => { const d = dist(p, qc); if (d < best) { best = d; j = i; } });
      const k = (j + 3) % 4; // o canto mais perto do QR é o superior direito
      H = homografia(MARCAS.centros, [0, 1, 2, 3].map((i) => pts[(i + k) % 4]));
    }
  }
  if (!codigo) throw new ErroLeitura("qr", "Achei a folha, mas não consegui ler o QR code. Aproxime um pouco o celular e evite sombra ou reflexo sobre o código.");
  const info = lerCodigoQR(codigo);
  const geo = geometria(info.nQ, info.nAlt, info.transcricao);
  const amostra = amostrador(g, w, h, H);
  const { resp, fills } = lerBolinhas(amostra, geo);
  return { codigo, info, resp, fills, H, geo, pts };
}

/* Desenha uma prévia reduzida com as marcações reconhecidas */
function previaLeitura(canvas, leitura, gabarito, largura = 520) {
  const k = largura / canvas.width;
  const cv = document.createElement("canvas");
  cv.width = largura; cv.height = Math.round(canvas.height * k);
  const ctx = cv.getContext("2d");
  ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
  const { H, geo, resp } = leitura;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#2f6fed";
  ctx.beginPath();
  MARCAS.centros.forEach(([X, Y], i) => { const [x, y] = H(X, Y); i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k); });
  ctx.closePath(); ctx.stroke();
  for (let q = 0; q < geo.nQ; q++) {
    const r = resp[q];
    const gab = gabarito ? gabarito[q] : null;
    for (let a = 0; a < geo.nAlt; a++) {
      const L = LETRAS[a];
      const marcada = r === L || (r === "*" && leitura.fills[q][a] >= 0.35);
      const correta = gab === L;
      if (!marcada && !correta) continue;
      const [X, Y] = geo.pos(q, a);
      const [x, y] = H(X, Y);
      const [x2] = H(X + geo.r, Y);
      const rad = Math.max(3, Math.abs(x2 - x) * k + 1.5);
      ctx.beginPath(); ctx.arc(x * k, y * k, rad, 0, Math.PI * 2);
      if (marcada) { ctx.strokeStyle = r === "*" ? "#e08a00" : correta || !gab || gab === "X" ? "#16a34a" : "#dc2626"; ctx.lineWidth = 2.5; }
      else { ctx.strokeStyle = "rgba(22,163,74,.6)"; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  return cv;
}

function arquivoParaCanvas(file, maxLado = 2200) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxLado / Math.max(im.naturalWidth, im.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new ErroLeitura("arquivo", "Não consegui abrir esta imagem.")); };
    im.src = url;
  });
}

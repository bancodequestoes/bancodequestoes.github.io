/* Folha de respostas: geometria, desenho (PDF, canvas, Word), código de barras e QR.
   Todas as medidas em milímetros numa folha A4 em pé (210 x 297). */

const A4 = { w: 210, h: 297 };
// Quadrados pretos dos cantos (centros), na ordem TL, TR, BR, BL
const MARCAS = { lado: 9, centros: [[12, 12], [198, 12], [198, 285], [12, 285]] };
const LETRAS = "ABCDE";
const MAX_QUESTOES = 100;

/* Geometria da grade de bolinhas. Depende só de nQ, nAlt e da caixa de transcrição,
   que vão dentro do QR code, então a leitura não depende de edições posteriores. */
function geometria(nQ, nAlt, transcricao) {
  const T = transcricao ? 113 : 92;          // topo do quadro de instruções
  const top = T + 26 + 13;                    // centro da primeira linha
  const bottom = 272;                         // centro máximo da última linha
  const cols = Math.min(4, Math.max(1, Math.ceil(nQ / 16)));
  const rows = Math.ceil(nQ / cols);
  const pitch = rows > 1 ? Math.min(7.6, (bottom - top) / (rows - 1)) : 7.6;
  const lab = 9, gapC = cols <= 2 ? 14 : 6;
  const px = Math.min(6.6, (174 / cols - lab - gapC) / nAlt);
  const r = Math.min(2.4, pitch * 0.36, px * 0.38);
  const colW = lab + nAlt * px + gapC;
  const x0 = 105 - (cols * colW - gapC) / 2;
  return {
    T, top, cols, rows, pitch, px, r, colW, x0, lab, gapC, nQ, nAlt,
    pos(q, a) {
      const c = Math.floor(q / rows), row = q % rows;
      return [x0 + c * colW + lab + (a + 0.5) * px, top + row * pitch];
    },
  };
}

/* ---------- Código de barras Code 128 ---------- */
const C128 = [11011001100, 11001101100, 11001100110, 10010011000, 10010001100, 10001001100, 10011001000, 10011000100, 10001100100, 11001001000, 11001000100, 11000100100, 10110011100, 10011011100, 10011001110, 10111001100, 10011101100, 10011100110, 11001110010, 11001011100, 11001001110, 11011100100, 11001110100, 11101101110, 11101001100, 11100101100, 11100100110, 11101100100, 11100110100, 11100110010, 11011011000, 11011000110, 11000110110, 10100011000, 10001011000, 10001000110, 10110001000, 10001101000, 10001100010, 11010001000, 11000101000, 11000100010, 10110111000, 10110001110, 10001101110, 10111011000, 10111000110, 10001110110, 11101110110, 11010001110, 11000101110, 11011101000, 11011100010, 11011101110, 11101011000, 11101000110, 11100010110, 11101101000, 11101100010, 11100011010, 11101111010, 11001000010, 11110001010, 10100110000, 10100001100, 10010110000, 10010000110, 10000101100, 10000100110, 10110010000, 10110000100, 10011010000, 10011000010, 10000110100, 10000110010, 11000010010, 11001010000, 11110111010, 11000010100, 10001111010, 10100111100, 10010111100, 10010011110, 10111100100, 10011110100, 10011110010, 11110100100, 11110010100, 11110010010, 11011011110, 11011110110, 11110110110, 10101111000, 10100011110, 10001011110, 10111101000, 10111100010, 11110101000, 11110100010, 10111011110, 10111101110, 11101011110, 11110101110, 11010000100, 11010010000, 11010011100, 1100011101011];
function code128(texto) {
  const s = String(texto);
  const codes = [];
  if (/^\d+$/.test(s) && s.length % 2 === 0) {
    codes.push(105);
    for (let i = 0; i < s.length; i += 2) codes.push(+s.slice(i, i + 2));
  } else {
    codes.push(104);
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      codes.push(c >= 32 && c < 128 ? c - 32 : 31);
    }
  }
  let soma = codes[0];
  for (let i = 1; i < codes.length; i++) soma += codes[i] * i;
  codes.push(soma % 103, 106);
  return codes.map((c) => String(C128[c])).join("");   // "1" = barra, "0" = espaço
}

/* ---------- QR code ---------- */
function qrMatriz(texto) {
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let y = 0; y < n; y++) { const linha = []; for (let x = 0; x < n; x++) linha.push(qr.isDark(y, x)); m.push(linha); }
  return m;
}

/* Conteúdo do QR: GB2|avaliação|turma|aluno|nQ|nAlt|transcrição */
function codigoQR(av, turmaId, alunoId) {
  return ["GB2", av.id, turmaId || "-", alunoId || "-", av.nQ, av.nAlt, av.transcricao ? 1 : 0].join("|");
}
function lerCodigoQR(txt) {
  const p = String(txt || "").split("|");
  if (p[0] !== "GB2" || p.length < 7) return null;
  return { avId: p[1], turmaId: p[2] === "-" ? null : p[2], alunoId: p[3] === "-" ? null : p[3], nQ: +p[4], nAlt: +p[5], transcricao: p[6] === "1" };
}

const INSTRUCOES_PADRAO = [
  "1. Não será permitido substituir a folha de respostas;",
  "2. Esta folha deverá, obrigatoriamente, ser devolvida ao aplicador;",
  "3. Não amasse, dobre ou rasure esta folha;",
  "4. Utilize caneta de tinta azul ou preta;",
  "5. Assinale apenas uma alternativa para cada questão; mais de uma marcação anulará a resposta.",
];

/* Monta a lista de operações de desenho de uma folha.
   d = { av, perfil, turma, aluno (ou null para folha neutra) } */
function opsFolha(d) {
  const { av, perfil = {}, turma, aluno } = d;
  const g = geometria(av.nQ, av.nAlt, av.transcricao);
  const ops = [];
  const cinzaBorda = "#9a9a9a", cinzaFundo = "#efefef", tinta = "#111111";
  const L = (o) => ops.push(o);

  for (const [x, y] of MARCAS.centros) L({ t: "rect", x: x - MARCAS.lado / 2, y: y - MARCAS.lado / 2, w: MARCAS.lado, h: MARCAS.lado, fill: "#000000" });

  // Código de barras (folha nominal) e QR code
  if (aluno) {
    const cod = String(aluno.ra || aluno.id);
    const bars = code128(cod);
    const mod = Math.min(0.42, 46 / bars.length);
    const bw = bars.length * mod;
    L({ t: "bars", bars, x: 105 - bw / 2, y: 8, h: 13, mod });
    L({ t: "text", s: cod.split("").join(" "), x: 105, y: 25.5, size: 10, align: "center", font: "courier" });
  }
  L({ t: "qr", s: codigoQR(av, turma && turma.id, aluno && aluno.id), x: 161, y: 7.5, size: 26 });

  // Títulos
  L({ t: "text", s: ("FOLHA DE RESPOSTAS" + (av.titulo ? " | " + av.titulo : "")).toUpperCase(), x: 18, y: 38, size: 17, bold: true, color: "#555555", maxW: 132 });
  if (av.componente) L({ t: "text", s: av.componente.toUpperCase(), x: 18, y: 45.5, size: 14, bold: true, color: tinta, maxW: 120 });
  const etapa = etapaDaTurma(turma);
  const sub = [etapa.toUpperCase(), (av.subtitulo || "").toUpperCase()].filter(Boolean).join(" - ");
  if (sub) L({ t: "text", s: sub, x: 18, y: 51, size: 10, color: "#333333", maxW: 125 });
  if (perfil.logo) L({ t: "img", src: perfil.logo, x: 150, y: 37, w: 42, h: 16 });

  // Campos
  const campo = (x, y, w, h, rot, valor, tam) => {
    L({ t: "rrect", x, y, w, h, stroke: "#b8b8b8", lw: 0.25, rx: 1.2 });
    L({ t: "text", s: rot, x: x + 1.8, y: y + h / 2 + 1.1, size: 7.5, bold: true, color: "#333333" });
    if (valor) L({ t: "text", s: valor, x: x + 1.8 + largTexto(rot, 7.5, true) + 1.5, y: y + h / 2 + 1.3, size: tam || 10, color: tinta, maxW: w - largTexto(rot, 7.5, true) - 5 });
  };
  campo(18, 55, 100, 7, "Município:", perfil.municipio);
  campo(120, 55, 36, 7, "Regional:", perfil.regional);
  campo(158, 55, 34, 7, "Turno:", av.turno || (turma && turma.turno) || "");
  campo(18, 64, 174, 7, "Escola:", perfil.escola);
  campo(18, 73, 70, 7, "Etapa Escolar:", etapa);
  campo(90, 73, 102, 7, "Turma:", turma ? turma.nome : "");
  campo(18, 82, 152, 7, "Estudante:", aluno ? aluno.nome : "", 10.5);
  campo(172, 82, 20, 7, "Nº:", aluno && aluno.num ? String(aluno.num).padStart(2, "0") : "");

  // Caixa de transcrição (opcional)
  if (av.transcricao) {
    L({ t: "rrect", x: 18, y: 92, w: 174, h: 18, stroke: "#b8b8b8", lw: 0.25, rx: 1.2 });
    L({ t: "line", x1: 62, y1: 92, x2: 62, y2: 110, color: "#b8b8b8", w: 0.25 });
    const linhas = quebrarTexto((av.transcricaoTexto || "ATENÇÃO: TRANSCREVA AQUI, COM A SUA CALIGRAFIA USUAL, A FRASE APRESENTADA NA CAPA DO SEU CADERNO DE QUESTÕES.").toUpperCase(), 6.2, 41, true);
    linhas.slice(0, 6).forEach((ln, i) => L({ t: "text", s: ln, x: 20, y: 95.6 + i * 2.6, size: 6.2, bold: true, color: "#222222" }));
  }

  // Instruções e exemplo
  const T = g.T;
  L({ t: "rrect", x: 18, y: T, w: 112, h: 24, stroke: "#b8b8b8", lw: 0.25, rx: 1.2 });
  L({ t: "rect", x: 18.15, y: T + 0.15, w: 111.7, h: 5, fill: cinzaFundo });
  L({ t: "text", s: "Instruções:", x: 20, y: T + 3.7, size: 8, bold: true, color: "#333333" });
  const instr = (av.instrucoes && av.instrucoes.trim() ? av.instrucoes.split("\n") : INSTRUCOES_PADRAO).flatMap((ln) => quebrarTexto(ln, 6.8, 106));
  instr.slice(0, 7).forEach((ln, i) => L({ t: "text", s: ln, x: 20, y: T + 8.3 + i * 2.55, size: 6.8, color: "#222222" }));
  L({ t: "rrect", x: 133, y: T, w: 59, h: 24, stroke: "#b8b8b8", lw: 0.25, rx: 1.2 });
  L({ t: "rect", x: 133.15, y: T + 0.15, w: 58.7, h: 5, fill: cinzaFundo });
  L({ t: "text", s: "Exemplo:", x: 135, y: T + 3.7, size: 8, bold: true, color: "#333333" });
  L({ t: "text", s: "Preencha a bolinha por completo:", x: 135, y: T + 9.5, size: 7, color: "#222222" });
  L({ t: "rrect", x: 141, y: T + 12.5, w: 43, h: 8, stroke: "#b8b8b8", lw: 0.2, rx: 1 });
  L({ t: "text", s: "00", x: 143, y: T + 16.5, size: 8, color: "#333333", mid: true });
  for (let a = 0; a < 4; a++) {
    const cx = 152 + a * 8, cy = T + 16.5;
    if (a === 1) L({ t: "circle", x: cx, y: cy, r: 2.6, fill: "#111111" });
    else { L({ t: "circle", x: cx, y: cy, r: 2.6, stroke: cinzaBorda, lw: 0.25 }); L({ t: "text", s: LETRAS[a], x: cx, y: cy + 0.1, size: 6.5, color: "#9a9a9a", align: "center", mid: true }); }
  }

  // Grade de respostas
  for (let c = 0; c < g.cols; c++) {
    const xc = g.x0 + c * g.colW - 1.5, wc = g.colW - g.gapC + 3;
    const nLin = Math.min(g.rows, av.nQ - c * g.rows);
    if (nLin <= 0) continue;
    L({ t: "rect", x: xc, y: g.top - g.pitch / 2 - 6, w: wc, h: 5.4, fill: cinzaFundo });
    L({ t: "text", s: "Questão | Resposta", x: xc + wc / 2, y: g.top - g.pitch / 2 - 3.3, size: Math.min(8, wc * 0.24), color: "#555555", align: "center", mid: true });
    for (let row = 0; row < nLin; row++) {
      const q = c * g.rows + row;
      const [, cy] = g.pos(q, 0);
      if (row % 2 === 1) L({ t: "rect", x: xc, y: cy - g.pitch / 2 + 0.25, w: wc, h: g.pitch - 0.5, fill: "#f3f3f3" });
      L({ t: "text", s: String(q + 1).padStart(2, "0"), x: g.x0 + c * g.colW + g.lab - 2, y: cy + 0.1, size: Math.min(9, g.r * 3.6), color: "#444444", align: "right", mid: true });
      for (let a = 0; a < av.nAlt; a++) {
        const [cx] = g.pos(q, a);
        L({ t: "circle", x: cx, y: cy, r: g.r, stroke: cinzaBorda, lw: 0.25 });
        L({ t: "text", s: LETRAS[a], x: cx, y: cy + 0.1, size: g.r * 2.5, color: "#a5a5a5", align: "center", mid: true });
      }
    }
  }

  L({ t: "text", s: aluno ? "Folha nominal · não troque com colegas" : "Folha neutra · escreva seu nome no campo Estudante", x: 105, y: 286, size: 6.5, color: "#888888", align: "center" });
  return ops;
}

function etapaDaTurma(turma) {
  if (!turma) return "";
  if (turma.etapa) return turma.etapa;
  const m = /(\d+)\s*[°º]/.exec(turma.nome || "");
  return m ? m[1] + "º ano" : "";
}

/* Medida aproximada de texto em Helvetica (mm), para posicionar e quebrar linhas */
let _ctxMed = null;
function largTexto(s, pt, bold) {
  if (!_ctxMed) _ctxMed = document.createElement("canvas").getContext("2d");
  _ctxMed.font = `${bold ? "700 " : ""}100px Helvetica, Arial, sans-serif`;
  return (_ctxMed.measureText(s).width / 100) * pt * 0.3528;
}
function quebrarTexto(s, pt, maxW, bold) {
  const out = []; let linha = "";
  for (const w of String(s).split(/\s+/)) {
    const t = linha ? linha + " " + w : w;
    if (largTexto(t, pt, bold) > maxW && linha) { out.push(linha); linha = w; } else linha = t;
  }
  if (linha) out.push(linha);
  return out;
}

/* ---------- Renderização ---------- */
function desenharPDF(doc, ops, imgs) {
  for (const o of ops) {
    switch (o.t) {
      case "rect": doc.setFillColor(o.fill); doc.rect(o.x, o.y, o.w, o.h, "F"); break;
      case "rrect": doc.setDrawColor(o.stroke); doc.setLineWidth(o.lw); doc.roundedRect(o.x, o.y, o.w, o.h, o.rx, o.rx, "S"); break;
      case "line": doc.setDrawColor(o.color); doc.setLineWidth(o.w); doc.line(o.x1, o.y1, o.x2, o.y2); break;
      case "circle":
        if (o.fill) { doc.setFillColor(o.fill); doc.circle(o.x, o.y, o.r, "F"); }
        else { doc.setDrawColor(o.stroke); doc.setLineWidth(o.lw); doc.circle(o.x, o.y, o.r, "S"); }
        break;
      case "text": {
        doc.setFont(o.font === "courier" ? "courier" : "helvetica", o.bold ? "bold" : "normal");
        let size = o.size;
        doc.setFontSize(size);
        if (o.maxW) while (doc.getTextWidth(o.s) > o.maxW && size > 5) doc.setFontSize((size -= 0.5));
        doc.setTextColor(o.color || "#000000");
        doc.text(String(o.s), o.x, o.y, { align: o.align || "left", baseline: o.mid ? "middle" : "alphabetic" });
        break;
      }
      case "bars": {
        doc.setFillColor("#000000");
        let i = 0;
        while (i < o.bars.length) {
          if (o.bars[i] === "1") { let j = i; while (j < o.bars.length && o.bars[j] === "1") j++; doc.rect(o.x + i * o.mod, o.y, (j - i) * o.mod, o.h, "F"); i = j; } else i++;
        }
        break;
      }
      case "qr": {
        const m = qrMatriz(o.s), n = m.length, s = o.size / n;
        doc.setFillColor("#000000");
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) doc.rect(o.x + x * s, o.y + y * s, s + 0.01, s + 0.01, "F");
        break;
      }
      case "img": {
        const im = imgs && imgs[o.src];
        if (!im) break;
        const k = Math.min(o.w / im.width, o.h / im.height);
        const w = im.width * k, h = im.height * k;
        try { doc.addImage(o.src, o.x + o.w - w, o.y + (o.h - h) / 2, w, h); } catch (e) { /* logo inválida: ignora */ }
        break;
      }
    }
  }
}

function desenharCanvas(ctx, ops, s, imgs) {
  ctx.save();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, A4.w * s, A4.h * s);
  for (const o of ops) {
    switch (o.t) {
      case "rect": ctx.fillStyle = o.fill; ctx.fillRect(o.x * s, o.y * s, o.w * s, o.h * s); break;
      case "rrect":
        ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw * s; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(o.x * s, o.y * s, o.w * s, o.h * s, o.rx * s); else ctx.rect(o.x * s, o.y * s, o.w * s, o.h * s);
        ctx.stroke(); break;
      case "line": ctx.strokeStyle = o.color; ctx.lineWidth = o.w * s; ctx.beginPath(); ctx.moveTo(o.x1 * s, o.y1 * s); ctx.lineTo(o.x2 * s, o.y2 * s); ctx.stroke(); break;
      case "circle":
        ctx.beginPath(); ctx.arc(o.x * s, o.y * s, o.r * s, 0, Math.PI * 2);
        if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } else { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw * s; ctx.stroke(); }
        break;
      case "text": {
        let size = o.size;
        const fam = o.font === "courier" ? "'Courier New', Courier, monospace" : "Helvetica, Arial, sans-serif";
        const setF = () => (ctx.font = `${o.bold ? "700 " : ""}${size * 0.3528 * s}px ${fam}`);
        setF();
        if (o.maxW) while (ctx.measureText(o.s).width > o.maxW * s && size > 5) { size -= 0.5; setF(); }
        ctx.fillStyle = o.color || "#000"; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.mid ? "middle" : "alphabetic";
        ctx.fillText(String(o.s), o.x * s, o.y * s); break;
      }
      case "bars": {
        ctx.fillStyle = "#000";
        for (let i = 0; i < o.bars.length; i++) if (o.bars[i] === "1") ctx.fillRect((o.x + i * o.mod) * s, o.y * s, Math.ceil(o.mod * s * 1000) / 1000 + 0.3, o.h * s);
        break;
      }
      case "qr": {
        const m = qrMatriz(o.s), n = m.length, q = (o.size / n) * s;
        ctx.fillStyle = "#000";
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) ctx.fillRect(o.x * s + x * q, o.y * s + y * q, q + 0.5, q + 0.5);
        break;
      }
      case "img": {
        const im = imgs && imgs[o.src];
        if (!im) break;
        const k = Math.min(o.w / im.width, o.h / im.height);
        const w = im.width * k, h = im.height * k;
        ctx.drawImage(im, (o.x + o.w - w) * s, (o.y + (o.h - h) / 2) * s, w * s, h * s);
        break;
      }
    }
  }
  ctx.restore();
}

function carregarImagens(srcs) {
  const out = {};
  return Promise.all([...new Set(srcs.filter(Boolean))].map((src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { out[src] = im; res(); };
    im.onerror = () => res();
    im.src = src;
  }))).then(() => out);
}

/* Lista de folhas a gerar: uma por aluno (nominal) ou n cópias neutras */
function folhasPara(av, turma, perfil, copiasNeutras) {
  if (av.tipo === "neutra") return Array.from({ length: Math.max(1, copiasNeutras || 1) }, () => ({ av, perfil, turma, aluno: null }));
  return (turma ? turma.alunos : []).map((aluno) => ({ av, perfil, turma, aluno }));
}

async function gerarPDF(folhas, aoProgredir) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const imgs = await carregarImagens(folhas.map((f) => f.perfil && f.perfil.logo));
  for (let i = 0; i < folhas.length; i++) {
    if (i) doc.addPage();
    desenharPDF(doc, opsFolha(folhas[i]), imgs);
    if (aoProgredir) aoProgredir(i + 1, folhas.length);
    if (i % 5 === 4) await new Promise((r) => setTimeout(r));
  }
  return doc.output("blob");
}

/* Word: cada folha vira uma imagem de página inteira, para manter a posição exata das bolinhas */
async function gerarDOCX(folhas, aoProgredir) {
  const s = 6.5; // px por mm (~165 dpi)
  const cv = document.createElement("canvas");
  cv.width = A4.w * s; cv.height = A4.h * s;
  const ctx = cv.getContext("2d");
  const imgs = await carregarImagens(folhas.map((f) => f.perfil && f.perfil.logo));
  const zip = new JSZip();
  const EMU = 36000;
  const cx = Math.round(209.5 * EMU), cy = Math.round(296.3 * EMU);
  let corpo = "", rels = "";
  for (let i = 0; i < folhas.length; i++) {
    desenharCanvas(ctx, opsFolha(folhas[i]), s, imgs);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.85));
    zip.file(`word/media/folha${i + 1}.jpg`, blob);
    rels += `<Relationship Id="rIdF${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/folha${i + 1}.jpg"/>`;
    corpo += `<w:p><w:pPr>${i ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i + 1}" name="Folha ${i + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="folha${i + 1}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdF${i + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    if (aoProgredir) aoProgredir(i + 1, folhas.length);
  }
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${corpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

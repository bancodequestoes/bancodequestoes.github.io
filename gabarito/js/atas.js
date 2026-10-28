/* Importação de atas (listas de alunos por turma).
   Modelo principal: ata .docx da escola, com "TURMA: 6° A BILÍNGUE" e a tabela Nº | R.A. | ALUNO (A) | ASSINATURA.
   Também aceita Excel/CSV (colunas parecidas) e PDF com o mesmo conteúdo. */

function limparNomeTurma(s) {
  let t = String(s || "").replace(/\s+/g, " ").trim();
  t = t.replace(/(\d+)\s*[°ºo]\s*/i, "$1º ");                 // 8°A -> 8º A
  t = t.replace(/\s*-\s*/g, " - ");
  t = t.replace(/^(\d+º [A-Z])\s+(?!- )/, "$1 - ");           // 6º A BILÍNGUE -> 6º A - BILÍNGUE
  return t.trim();
}

function normalizarNome(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

/* Número da linha da ata. Nas atas da escola os números 9, 19, 29... aparecem como "0G", "1G", "2G" */
function numeroDaLinha(txt, anterior) {
  const t = String(txt || "").trim();
  let m = /^(\d{1,3})$/.exec(t);
  if (m) return +m[1];
  m = /^(\d)G$/i.exec(t);
  if (m) return +m[1] * 10 + 9;
  return (anterior || 0) + 1;
}

/* Converte linhas de tabela (arrays de texto) em alunos */
function linhasParaAlunos(linhas) {
  const alunos = [];
  let turma = null, escola = [], ult = 0;
  let colRA = -1, colNome = -1, colNum = -1;
  for (const cels0 of linhas) {
    const cels = cels0.map((c) => normalizarNome(c));
    const junto = cels.join(" ");
    const mT = /TURMA\s*:\s*(.+)/i.exec(junto);
    if (mT && !alunos.length) { turma = mT[1].trim(); continue; }
    // cabeçalho de tabela
    const iNome = cels.findIndex((c) => /^(aluno|nome|estudante)/i.test(c));
    if (iNome >= 0 && cels.some((c) => /r\.?\s?a\.?|matr/i.test(c))) {
      colNome = iNome;
      colRA = cels.findIndex((c) => /^r\.?\s?a\.?$|matr/i.test(c));
      colNum = cels.findIndex((c) => /^(n[º°o.]?|num|nº)$/i.test(c) || c === "");
      continue;
    }
    // linha de aluno: tem um código de 5+ dígitos e um nome com letras
    let iRA = colRA >= 0 && /^\d{5,}$/.test(cels[colRA] || "") ? colRA : cels.findIndex((c) => /^\d{5,}$/.test(c));
    let iN = colNome >= 0 && /[A-Za-zÀ-ú]{2,}/.test(cels[colNome] || "") ? colNome : -1;
    if (iN < 0) {
      let melhor = -1;
      cels.forEach((c, i) => { if (i !== iRA && /^[A-Za-zÀ-ú' .-]{5,}$/.test(c) && c.includes(" ") && (melhor < 0 || c.length > cels[melhor].length)) melhor = i; });
      iN = melhor;
    }
    if (iN < 0) {
      if (cels.length === 1 && cels[0] && !alunos.length) escola.push(cels[0]);
      continue;
    }
    if (iRA < 0 && !cels.some((c) => /^\d{1,3}$|^\dG$/i.test(c))) continue;
    const numTxt = colNum >= 0 ? cels[colNum] : cels.find((c, i) => i !== iRA && i !== iN && /^(\d{1,3}|\dG)$/i.test(c));
    const num = numeroDaLinha(numTxt, ult);
    ult = num;
    alunos.push({ num, ra: iRA >= 0 ? cels[iRA] : "", nome: cels[iN].toUpperCase() });
  }
  return { turma, escola, alunos };
}

async function lerDocx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml").async("string")).replace(/^\uFEFF/, "");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const texto = (el) => Array.from(el.getElementsByTagNameNS(W, "t")).map((t) => t.textContent).join("");
  const linhas = [];
  for (const tr of Array.from(doc.getElementsByTagNameNS(W, "tr"))) {
    const cels = Array.from(tr.childNodes).filter((n) => n.localName === "tc").map(texto);
    linhas.push(cels);
  }
  // parágrafos fora de tabelas (ex.: "TURMA: ..." escrito fora da tabela)
  const fora = Array.from(doc.getElementsByTagNameNS(W, "p")).filter((p) => !p.closest || !p.closest("tc"));
  const extras = fora.map(texto).filter((t) => /TURMA\s*:/i.test(t)).map((t) => [t]);
  return linhasParaAlunos(extras.concat(linhas));
}

async function lerPlanilha(buf, ehCSV) {
  let wb;
  if (ehCSV) {
    let txt = new TextDecoder("utf-8").decode(buf);
    if (txt.includes("�")) txt = new TextDecoder("windows-1252").decode(buf);
    wb = XLSX.read(txt, { type: "string", raw: true });
  } else wb = XLSX.read(buf, { type: "array", raw: true });
  const resultados = [];
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: false, defval: "" }).map((r) => r.map((c) => String(c)));
    const r = linhasParaAlunos(linhas);
    if (!r.turma && wb.SheetNames.length > 1) r.turma = nome;
    if (r.alunos.length) resultados.push(r);
  }
  return resultados;
}

async function lerPDF(buf) {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const linhas = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const porY = new Map();
    for (const it of tc.items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      if (!porY.has(y)) porY.set(y, []);
      porY.get(y).push({ x: it.transform[4], s: it.str.trim() });
    }
    [...porY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, its]) => linhas.push(its.sort((a, b) => a.x - b.x).map((i) => i.s)));
  }
  return linhasParaAlunos(linhas);
}

/* Lê um arquivo de ata e devolve uma ou mais turmas: [{arquivo, turma, escola, alunos, avisos}] */
async function importarAta(file) {
  const buf = await file.arrayBuffer();
  const nome = file.name.toLowerCase();
  let rs;
  if (nome.endsWith(".docx")) rs = [await lerDocx(buf)];
  else if (nome.endsWith(".pdf")) rs = [await lerPDF(buf)];
  else if (/\.(xlsx|xls|ods)$/.test(nome)) rs = await lerPlanilha(buf, false);
  else if (/\.(csv|txt)$/.test(nome)) rs = await lerPlanilha(buf, true);
  else throw new Error("Formato não reconhecido. Use .docx, .pdf, .xlsx ou .csv.");
  if (!rs.some((r) => r.alunos.length)) throw new Error("Não encontrei alunos neste arquivo. A ata precisa ter as colunas Nº, R.A. e nome do aluno.");
  return rs.filter((r) => r.alunos.length).map((r) => {
    const avisos = [];
    const vistos = new Map();
    const alunos = [];
    for (const a of r.alunos) {
      if (a.ra && vistos.has(a.ra)) { avisos.push(`${a.nome} aparece duas vezes (Nº ${vistos.get(a.ra)} e Nº ${a.num}). Mantive só a primeira.`); continue; }
      if (a.ra) vistos.set(a.ra, a.num);
      if (!a.ra) avisos.push(`${a.nome} está sem R.A.; vou gerar um código para ele.`);
      alunos.push(a);
    }
    const nums = alunos.map((a) => a.num);
    if (new Set(nums).size !== nums.length) avisos.push("Há números de chamada repetidos na ata.");
    const turma = r.turma ? limparNomeTurma(r.turma) : limparNomeTurma(file.name.replace(/\.[^.]+$/, ""));
    return { arquivo: file.name, turma, escola: r.escola || [], alunos, avisos };
  });
}

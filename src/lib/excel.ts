import type { Proposal, Transaction } from "./db";
import type {
  FinancialMonth,
  Milestone,
  ReportContent,
  ReportOptions,
  RiskItem,
  StrategicItem,
  PlanilhaFinanceiraData,
  PlanoItem,
  ProjecaoMes,
} from "./claude";

// ── Colour palette (ARGB) ─────────────────────────────────────────────────────
const C = {
  GOLD:        "FFD8B75D",
  GOLD_SOFT:   "33D8B75D",
  DARK:        "FF090B0F",
  SURFACE:     "FF0D1016",
  SURFACE2:    "FF111520",
  GREEN:       "FF72C58A",
  GREEN_SOFT:  "2272C58A",
  RED:         "FFD65C55",
  RED_SOFT:    "22D65C55",
  WHITE:       "FFFFFFFF",
  MUTED:       "FFAAA8A0",
} as const;

function parseValue(str: string): number {
  return parseFloat((str ?? "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

type AnyWorksheet = {
  addRow: (values: unknown[]) => AnyRow;
  getColumn: (id: number | string) => { width: number; numFmt?: string };
  mergeCells: (range: string) => void;
  getRow: (n: number) => AnyRow;
  getCell: (addr: string) => AnyCell;
  rowCount: number;
};

type AnyRow = {
  getCell: (n: number) => AnyCell;
  font?: unknown;
  fill?: unknown;
  border?: unknown;
  alignment?: unknown;
  height?: number;
  values?: unknown[];
  eachCell?: (cb: (cell: AnyCell) => void) => void;
};

type AnyCell = {
  value: unknown;
  font?: unknown;
  fill?: unknown;
  border?: unknown;
  alignment?: unknown;
  numFmt?: string;
};

// ── Style helpers ─────────────────────────────────────────────────────────────

function solidFill(argb: string) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } } as const;
}

function goldBorder() {
  return {
    bottom: { style: "medium", color: { argb: C.GOLD } },
  } as const;
}

function applyTitleRow(ws: AnyWorksheet, text: string, cols: number) {
  ws.mergeCells(`A1:${String.fromCharCode(64 + cols)}1`);
  const row = ws.getRow(1);
  const cell = row.getCell(1);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: C.GOLD } };
  cell.fill = solidFill(C.DARK);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  row.height = 32;
}

function applyHeaderRow(ws: AnyWorksheet, rowNum: number, labels: string[]) {
  const row = ws.getRow(rowNum);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: C.GOLD } };
    cell.fill = solidFill(C.DARK);
    cell.border = goldBorder();
    cell.alignment = { horizontal: "left", vertical: "middle" };
  });
  row.height = 22;
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildResumoSheet(
  workbook: { addWorksheet: (name: string) => AnyWorksheet },
  proposal: Proposal | null,
  transactions: Transaction[]
) {
  const ws = workbook.addWorksheet("Resumo Executivo");
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 38;

  applyTitleRow(ws, "RESUMO EXECUTIVO", 2);

  let row = 3;
  const kv = proposal
    ? [
        ["Cliente", proposal.clienteNome],
        ["Serviço principal", proposal.servicoPrincipal],
        ["Valor total", proposal.valorTotal],
        ["Condição de pagamento", proposal.condicao],
        ["Prazo", proposal.prazo],
        ["Status", proposal.status],
      ]
    : [["Modo", "Relatório consolidado — todas as propostas"]];

  for (const [label, value] of kv) {
    const r = ws.getRow(row);
    const ca = r.getCell(1);
    ca.value = label;
    ca.font = { bold: true, color: { argb: C.MUTED } };
    ca.fill = solidFill(C.SURFACE);
    const cb = r.getCell(2);
    cb.value = value;
    cb.fill = solidFill(row % 2 === 0 ? C.SURFACE : C.SURFACE2);
    row++;
  }

  row++;
  applyHeaderRow(ws, row, ["Indicador financeiro", "Valor"]);
  row++;

  const clientTx = proposal
    ? transactions.filter((t) => t.clienteNome === proposal.clienteNome)
    : transactions;
  const receitas = clientTx.filter((t) => t.kind === "receita").reduce((s, t) => s + parseValue(t.valor), 0);
  const despesas = clientTx.filter((t) => t.kind === "despesa").reduce((s, t) => s + parseValue(t.valor), 0);
  const resultado = receitas - despesas;
  const margem = receitas > 0 ? ((resultado / receitas) * 100).toFixed(1) + "%" : "0%";

  for (const [label, value] of [
    ["Receitas registradas", `R$ ${receitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Despesas registradas", `R$ ${despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Resultado líquido", `R$ ${resultado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Margem líquida", margem],
  ]) {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, color: { argb: C.MUTED } };
    r.getCell(1).fill = solidFill(C.SURFACE);
    r.getCell(2).value = value;
    r.getCell(2).fill = solidFill(row % 2 === 0 ? C.SURFACE : C.SURFACE2);
    row++;
  }

  if (clientTx.length > 0) {
    row++;
    applyHeaderRow(ws, row, ["Data", "Tipo", "Valor", "Status"]);
    row++;
    for (const t of clientTx.slice(0, 20)) {
      const r = ws.getRow(row);
      r.getCell(1).value = t.data;
      r.getCell(2).value = t.kind;
      r.getCell(3).value = `R$ ${parseValue(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      r.getCell(3).font = { color: { argb: t.kind === "receita" ? C.GREEN : C.RED } };
      r.getCell(4).value = t.status;
      for (let c = 1; c <= 4; c++) {
        (r.getCell(c) as AnyCell).fill = solidFill(row % 2 === 0 ? C.SURFACE : C.SURFACE2);
      }
      row++;
    }
  }
}

function buildFinanceiroSheet(workbook: { addWorksheet: (name: string) => AnyWorksheet }, data: FinancialMonth[]) {
  const ws = workbook.addWorksheet("Projeção Financeira");
  [20, 16, 16, 16, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTitleRow(ws, "PROJEÇÃO FINANCEIRA — 12 MESES", 5);
  applyHeaderRow(ws, 2, ["Mês", "Receita R$", "Despesa R$", "Líquido R$", "Acumulado R$"]);

  let totR = 0, totD = 0;
  data.forEach((m, i) => {
    const row = ws.getRow(i + 3);
    row.getCell(1).value = m.mes;
    row.getCell(2).value = m.receita;
    row.getCell(3).value = m.despesa;
    row.getCell(4).value = m.liquido;
    row.getCell(4).font = { color: { argb: m.liquido >= 0 ? C.GREEN : C.RED } };
    row.getCell(5).value = m.acumulado;
    row.getCell(5).font = { color: { argb: m.acumulado >= 0 ? C.GREEN : C.RED } };
    for (let c = 2; c <= 5; c++) {
      const cell = row.getCell(c);
      (cell as AnyCell).numFmt = '#,##0.00';
      (cell as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
    }
    (row.getCell(1) as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
    totR += m.receita;
    totD += m.despesa;
  });

  const totRow = ws.getRow(data.length + 3);
  totRow.getCell(1).value = "TOTAL";
  totRow.getCell(1).font = { bold: true, color: { argb: C.GOLD } };
  totRow.getCell(2).value = totR;
  totRow.getCell(3).value = totD;
  totRow.getCell(4).value = totR - totD;
  totRow.getCell(4).font = { bold: true, color: { argb: totR - totD >= 0 ? C.GREEN : C.RED } };
  for (let c = 1; c <= 5; c++) {
    (totRow.getCell(c) as AnyCell).fill = solidFill(C.DARK);
    (totRow.getCell(c) as AnyCell).border = { top: { style: "medium", color: { argb: C.GOLD } } } as never;
    if (c >= 2) (totRow.getCell(c) as AnyCell).numFmt = '#,##0.00';
  }
}

function buildMilestonesSheet(workbook: { addWorksheet: (name: string) => AnyWorksheet }, data: Milestone[]) {
  const ws = workbook.addWorksheet("Planejamento");
  [20, 40, 14, 14, 22, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTitleRow(ws, "PLANEJAMENTO & MARCOS DO PROJETO", 6);
  applyHeaderRow(ws, 2, ["Fase", "Descrição", "Início", "Fim", "Responsável", "Status"]);

  data.forEach((m, i) => {
    const row = ws.getRow(i + 3);
    const statusFill =
      m.status === "concluído" ? C.GREEN_SOFT :
      m.status === "em andamento" ? C.GOLD_SOFT : C.SURFACE;

    row.getCell(1).value = m.fase;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = m.descricao;
    (row.getCell(2) as AnyCell).alignment = { wrapText: true };
    row.getCell(3).value = m.inicio;
    row.getCell(4).value = m.fim;
    row.getCell(5).value = m.responsavel;
    row.getCell(6).value = m.status;
    row.getCell(6).font = {
      color: { argb: m.status === "concluído" ? C.GREEN : m.status === "em andamento" ? C.GOLD : C.MUTED }
    };
    for (let c = 1; c <= 6; c++) {
      (row.getCell(c) as AnyCell).fill = solidFill(c === 6 ? statusFill : (i % 2 === 0 ? C.SURFACE : C.SURFACE2));
    }
  });
}

function buildEstrategiaSheet(workbook: { addWorksheet: (name: string) => AnyWorksheet }, data: StrategicItem[]) {
  const ws = workbook.addWorksheet("Estratégia");
  [24, 48, 14, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTitleRow(ws, "ESTRATÉGIA & RECOMENDAÇÕES", 4);
  applyHeaderRow(ws, 2, ["Tema", "Descrição", "Prioridade", "Prazo"]);

  data.forEach((item, i) => {
    const row = ws.getRow(i + 3);
    const prioColor =
      item.prioridade === "Alta" ? C.RED :
      item.prioridade === "Média" ? C.GOLD : C.GREEN;

    row.getCell(1).value = item.tema;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = item.descricao;
    (row.getCell(2) as AnyCell).alignment = { wrapText: true };
    row.getCell(3).value = item.prioridade;
    row.getCell(3).font = { bold: true, color: { argb: prioColor } };
    row.getCell(4).value = item.prazo;
    for (let c = 1; c <= 4; c++) {
      (row.getCell(c) as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
    }
  });
}

function buildFluxoSheet(
  workbook: { addWorksheet: (name: string) => AnyWorksheet },
  proposal: Proposal | null,
  transactions: Transaction[]
) {
  const ws = workbook.addWorksheet("Fluxo de Caixa");
  [12, 10, 24, 24, 16, 12, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTitleRow(ws, "FLUXO DE CAIXA", 7);
  applyHeaderRow(ws, 2, ["Data", "Tipo", "Cliente / Fornecedor", "Serviço / Categoria", "Valor R$", "Status", "Pagamento"]);

  const tx = proposal
    ? transactions.filter((t) => t.clienteNome === proposal.clienteNome)
    : transactions;

  let totReceita = 0, totDespesa = 0;
  tx.forEach((t, i) => {
    const row = ws.getRow(i + 3);
    const val = parseValue(t.valor);
    row.getCell(1).value = t.data;
    row.getCell(2).value = t.kind;
    row.getCell(3).value = t.kind === "receita" ? (t.clienteNome || "—") : (t.fornecedor || "—");
    row.getCell(4).value = t.servico || t.categoria || "—";
    row.getCell(5).value = val;
    (row.getCell(5) as AnyCell).numFmt = 'R$ #,##0.00';
    row.getCell(5).font = { color: { argb: t.kind === "receita" ? C.GREEN : C.RED } };
    row.getCell(6).value = t.status;
    row.getCell(7).value = t.pagamento || "—";
    for (let c = 1; c <= 7; c++) {
      (row.getCell(c) as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
    }
    if (t.kind === "receita") totReceita += val; else totDespesa += val;
  });

  const totRow = ws.getRow(tx.length + 3);
  totRow.getCell(1).value = "TOTAIS";
  totRow.getCell(1).font = { bold: true, color: { argb: C.GOLD } };
  totRow.getCell(3).value = `Receitas: R$ ${totReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  totRow.getCell(3).font = { color: { argb: C.GREEN } };
  totRow.getCell(4).value = `Despesas: R$ ${totDespesa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  totRow.getCell(4).font = { color: { argb: C.RED } };
  totRow.getCell(5).value = totReceita - totDespesa;
  (totRow.getCell(5) as AnyCell).numFmt = 'R$ #,##0.00';
  totRow.getCell(5).font = { bold: true, color: { argb: totReceita - totDespesa >= 0 ? C.GREEN : C.RED } };
  for (let c = 1; c <= 7; c++) {
    (totRow.getCell(c) as AnyCell).fill = solidFill(C.DARK);
    (totRow.getCell(c) as AnyCell).border = { top: { style: "medium", color: { argb: C.GOLD } } } as never;
  }
}

function buildRiscosSheet(workbook: { addWorksheet: (name: string) => AnyWorksheet }, data: RiskItem[]) {
  const ws = workbook.addWorksheet("Análise de Risco");
  [30, 16, 14, 44].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTitleRow(ws, "ANÁLISE DE RISCO", 4);
  applyHeaderRow(ws, 2, ["Risco", "Probabilidade", "Impacto", "Mitigação"]);

  data.forEach((item, i) => {
    const row = ws.getRow(i + 3);
    const probColor =
      item.probabilidade === "Alta" ? C.RED :
      item.probabilidade === "Média" ? C.GOLD : C.GREEN;
    const impactColor =
      item.impacto === "Alto" ? C.RED :
      item.impacto === "Médio" ? C.GOLD : C.GREEN;
    const probFill =
      item.probabilidade === "Alta" ? C.RED_SOFT :
      item.probabilidade === "Média" ? C.GOLD_SOFT : C.GREEN_SOFT;

    row.getCell(1).value = item.risco;
    row.getCell(2).value = item.probabilidade;
    row.getCell(2).font = { bold: true, color: { argb: probColor } };
    (row.getCell(2) as AnyCell).fill = solidFill(probFill);
    row.getCell(3).value = item.impacto;
    row.getCell(3).font = { bold: true, color: { argb: impactColor } };
    (row.getCell(3) as AnyCell).fill = solidFill(
      item.impacto === "Alto" ? C.RED_SOFT : item.impacto === "Médio" ? C.GOLD_SOFT : C.GREEN_SOFT
    );
    row.getCell(4).value = item.mitigacao;
    (row.getCell(4) as AnyCell).alignment = { wrapText: true };
    (row.getCell(1) as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
    (row.getCell(4) as AnyCell).fill = solidFill(i % 2 === 0 ? C.SURFACE : C.SURFACE2);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportToExcel(
  proposal: Proposal | null,
  transactions: Transaction[],
  reportContent: ReportContent,
  options: ReportOptions
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const { saveAs } = await import("file-saver");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hono AI Enterprise";
  workbook.created = new Date();

  if (options.sheets.includes("resumo"))
    buildResumoSheet(workbook as never, proposal, transactions);
  if (options.sheets.includes("financeiro") && reportContent.financeiro?.length)
    buildFinanceiroSheet(workbook as never, reportContent.financeiro);
  if (options.sheets.includes("milestones") && reportContent.milestones?.length)
    buildMilestonesSheet(workbook as never, reportContent.milestones);
  if (options.sheets.includes("estrategia") && reportContent.estrategia?.length)
    buildEstrategiaSheet(workbook as never, reportContent.estrategia);
  if (options.sheets.includes("fluxo"))
    buildFluxoSheet(workbook as never, proposal, transactions);
  if (options.sheets.includes("riscos") && reportContent.riscos?.length)
    buildRiscosSheet(workbook as never, reportContent.riscos);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const clienteSlug = (proposal?.clienteNome ?? "geral").replace(/\s+/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `relatorio-${clienteSlug}-${date}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PLANILHA FINANCEIRA PADRÃO HONO IA — 8 abas
// ══════════════════════════════════════════════════════════════════════════════

const CF = {
  PRETO:          "FF0B0B0F",
  PRETO_2:        "FF14141A",
  PRETO_3:        "FF1F1F28",
  DOURADO:        "FFD4A744",
  DOURADO_CLARO:  "FFE8C46B",
  DOURADO_ESCURO: "FF9A7A30",
  BRANCO:         "FFFFFFFF",
  CINZA_CLARO:    "FFB8B8C0",
  CINZA:          "FF6E6E78",
  VERDE:          "FF4ADE80",
  VERMELHO:       "FFF87171",
  LARANJA:        "FFFB923C",
  CIANO:          "FF22D3EE",
  ROXO:           "FFA78BFA",
  AZUL_INPUT:     "FF0066FF",
  FUNDO_INPUT:    "FF2A2418",
} as const;

const PLAN_COLORS = [CF.DOURADO, CF.VERDE, CF.LARANJA, CF.CIANO, CF.VERMELHO, CF.ROXO];
const FMT_BRL  = 'R$ #,##0;[Red](R$ #,##0);"-"';
const FMT_PCT  = '0.0%;[Red](0.0%);"-"';
const FMT_INT  = '#,##0;[Red](#,##0);"-"';

function cfFill(argb: string) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } } as const;
}

function cfBorderGold(style: "thin" | "medium" | "thick" = "thin") {
  return { style, color: { argb: CF.DOURADO_ESCURO } } as const;
}


function cfSetNoGridlines(ws: AnyWorksheet) {
  (ws as unknown as { sheet_view?: { showGridLines: boolean }; sheetView?: { showGridLines: boolean } }).sheet_view = { showGridLines: false };
  (ws as unknown as { sheet_view?: { showGridLines: boolean }; sheetView?: { showGridLines: boolean } }).sheetView = { showGridLines: false };
}

function cfSectionTitle(ws: AnyWorksheet, row: number, col: number, text: string, mergeEnd?: number) {
  if (mergeEnd) ws.mergeCells(`${colLetter(col)}${row}:${colLetter(mergeEnd)}${row}`);
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: CF.DOURADO }, name: "Arial" };
  cell.fill = cfFill(CF.PRETO_2);
  cell.border = { bottom: { style: "medium", color: { argb: CF.DOURADO_ESCURO } } } as never;
  ws.getRow(row).height = 24;
}

function cfTableHeader(ws: AnyWorksheet, row: number, cols: string[], startCol = 2) {
  const r = ws.getRow(row);
  r.height = 22;
  cols.forEach((label, i) => {
    const cell = r.getCell(startCol + i);
    cell.value = label;
    cell.font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial", size: 9 };
    cell.fill = cfFill(CF.PRETO_3);
    cell.border = {
      top: { style: "medium", color: { argb: CF.DOURADO_ESCURO } },
      bottom: { style: "medium", color: { argb: CF.DOURADO_ESCURO } },
    } as never;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

function cfInputCell(cell: AnyCell, value: unknown, fmt?: string) {
  cell.value = value;
  cell.font = { bold: true, color: { argb: CF.AZUL_INPUT }, name: "Arial", size: 10 };
  cell.fill = cfFill(CF.FUNDO_INPUT);
  cell.border = {
    top: cfBorderGold("thin"), bottom: cfBorderGold("thin"),
    left: cfBorderGold("thin"), right: cfBorderGold("thin"),
  } as never;
  if (fmt) cell.numFmt = fmt;
}

function cfDataCell(cell: AnyCell, value: unknown, alt: boolean, fmt?: string, color?: string) {
  cell.value = value;
  cell.font = { color: { argb: color ?? CF.BRANCO }, name: "Arial", size: 10 };
  cell.fill = cfFill(alt ? CF.PRETO_2 : CF.PRETO_3);
  if (fmt) cell.numFmt = fmt;
  cell.alignment = { vertical: "middle" };
}

function cfFooter(ws: AnyWorksheet, row: number, cnpj: string, colSpan = 12) {
  ws.mergeCells(`A${row}:${colLetter(colSpan)}${row}`);
  const cell = ws.getRow(row).getCell(1);
  cell.value = `CNPJ: ${cnpj || "—"}  ·  Documento Confidencial  ·  Hono IA Enterprise`;
  cell.font = { italic: true, size: 8, color: { argb: CF.CINZA }, name: "Arial" };
  cell.fill = cfFill(CF.PRETO);
  cell.alignment = { horizontal: "center" };
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ── Aba 1: Dashboard ──────────────────────────────────────────────────────────
function buildCfDashboard(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Dashboard");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.DOURADO };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 2;

  // Header
  ws.mergeCells("B1:E1");
  ws.getRow(1).height = 14;
  ws.mergeCells("B2:E2");
  const titleCell = ws.getRow(2).getCell(2);
  titleCell.value = data.nomeEmpresa.toUpperCase();
  titleCell.font = { bold: true, size: 22, color: { argb: CF.DOURADO }, name: "Arial" };
  titleCell.fill = cfFill(CF.PRETO);
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 42;

  ws.mergeCells("B3:E3");
  const subCell = ws.getRow(3).getCell(2);
  subCell.value = `Controle Financeiro — ${data.produto}`;
  subCell.font = { size: 11, color: { argb: CF.DOURADO_CLARO }, name: "Arial", italic: true };
  subCell.fill = cfFill(CF.PRETO);
  subCell.alignment = { horizontal: "center" };
  ws.getRow(3).height = 20;

  // Divider
  ws.mergeCells("B4:E4");
  const divCell = ws.getRow(4).getCell(2);
  divCell.value = "";
  divCell.fill = cfFill(CF.PRETO);
  divCell.border = { bottom: { style: "medium", color: { argb: CF.DOURADO } } } as never;
  ws.getRow(4).height = 6;

  // KPI cards row
  ws.getRow(5).height = 10;
  const m1 = data.projecao12m[0];
  const m12 = data.projecao12m[data.projecao12m.length - 1];
  const totReceita = data.projecao12m.reduce((s, m) => s + m.totalReceita, 0);
  const totLucro = m12?.caixaAcumulado ?? 0;

  const kpis = [
    { label: "Receita Mês 1", value: m1?.totalReceita ?? 0, fmt: FMT_BRL, color: CF.DOURADO },
    { label: "Lucro Mês 1", value: m1?.lucroLiquido ?? 0, fmt: FMT_BRL, color: (m1?.lucroLiquido ?? 0) >= 0 ? CF.VERDE : CF.VERMELHO },
    { label: "Receita Acum. 12m", value: totReceita, fmt: FMT_BRL, color: CF.DOURADO_CLARO },
    { label: "Lucro Acum. 12m", value: totLucro, fmt: FMT_BRL, color: totLucro >= 0 ? CF.VERDE : CF.VERMELHO },
  ];

  kpis.forEach((kpi, i) => {
    const col = 2 + i;
    ws.getRow(6).height = 16;
    const borderCell = ws.getRow(6).getCell(col);
    borderCell.fill = cfFill(CF.PRETO_3);
    borderCell.border = { top: { style: "thick", color: { argb: kpi.color } } } as never;

    ws.getRow(7).height = 18;
    const labelCell = ws.getRow(7).getCell(col);
    labelCell.value = kpi.label;
    labelCell.font = { size: 9, color: { argb: CF.CINZA_CLARO }, name: "Arial" };
    labelCell.fill = cfFill(CF.PRETO_3);
    labelCell.alignment = { horizontal: "center" };

    ws.getRow(8).height = 28;
    const valCell = ws.getRow(8).getCell(col);
    valCell.value = kpi.value;
    valCell.numFmt = kpi.fmt;
    valCell.font = { bold: true, size: 14, color: { argb: kpi.color }, name: "Arial" };
    valCell.fill = cfFill(CF.PRETO_3);
    valCell.alignment = { horizontal: "center", vertical: "middle" };

    ws.getRow(9).height = 8;
    const padCell = ws.getRow(9).getCell(col);
    padCell.fill = cfFill(CF.PRETO_3);
  });

  // Charts title
  ws.getRow(10).height = 14;
  ws.mergeCells("B11:C11");
  cfSectionTitle(ws, 11, 2, "▸ Evolução Receita & Lucro (12m)");
  ws.mergeCells("D11:E11");
  cfSectionTitle(ws, 11, 4, "▸ Base de Clientes (12m)");
  ws.mergeCells("B21:C21");
  cfSectionTitle(ws, 21, 2, "▸ Receita por Plano");
  ws.mergeCells("D21:E21");
  cfSectionTitle(ws, 21, 4, "▸ Comparativo de Cenários");

  // Hidden data for charts (row 60+)
  ws.getRow(59).height = 8;
  cfSectionTitle(ws, 60, 2, "DADOS DOS GRÁFICOS (oculto)");
  const headerRow = ws.getRow(61);
  ["Mês", "Receita", "Lucro", "Clientes"].forEach((h, i) => {
    const cell = headerRow.getCell(2 + i);
    cell.value = h;
    cell.font = { bold: true, size: 8, color: { argb: CF.CINZA }, name: "Arial" };
    cell.fill = cfFill(CF.PRETO);
  });
  data.projecao12m.forEach((m, i) => {
    const r = ws.getRow(62 + i);
    r.getCell(2).value = m.mes;
    r.getCell(3).value = m.totalReceita;
    r.getCell(4).value = m.lucroLiquido;
    r.getCell(5).value = m.clientesAtivos;
    r.getCell(2).font = { size: 8, color: { argb: CF.CINZA } };
    r.getCell(3).font = { size: 8, color: { argb: CF.CINZA } };
    r.getCell(4).font = { size: 8, color: { argb: CF.CINZA } };
    r.getCell(5).font = { size: 8, color: { argb: CF.CINZA } };
    for (let c = 2; c <= 5; c++) (r.getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
  });
  // Hide rows 60-80
  for (let r = 60; r <= 80; r++) {
    (ws as unknown as { getRow: (n: number) => { hidden?: boolean } }).getRow(r).hidden = true;
  }

  // Planos data for 3rd chart
  ws.getRow(78).height = 8;
  const plHeader = ws.getRow(79);
  ["Plano", "Total/mês"].forEach((h, i) => {
    plHeader.getCell(2 + i).value = h;
    plHeader.getCell(2 + i).font = { size: 8, color: { argb: CF.CINZA } };
  });
  data.planos.forEach((p, i) => {
    const r = ws.getRow(80 + i);
    r.getCell(2).value = p.nome;
    r.getCell(3).value = p.mensalidade + data.taxaFixaMensal;
    r.getCell(2).font = { size: 8, color: { argb: CF.CINZA } };
    r.getCell(3).font = { size: 8, color: { argb: CF.CINZA } };
  });

  // Footer
  cfFooter(ws, 57, data.cnpj, 5);

  // Paint black background
  for (let r = 1; r <= 56; r++) {
    for (let c = 1; c <= 6; c++) {
      const cell = ws.getRow(r).getCell(c);
      if (!(cell as AnyCell).fill || (cell as AnyCell).fill === undefined) {
        (cell as AnyCell).fill = cfFill(CF.PRETO);
      }
    }
  }
}

// ── Aba 2: Premissas ──────────────────────────────────────────────────────────
function buildCfPremissas(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Premissas");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.DOURADO_CLARO };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 30;
  ws.getColumn(6).width = 2;

  // Paint background
  for (let r = 1; r <= 80; r++) {
    for (let c = 1; c <= 6; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Header
  ws.mergeCells("B1:E1");
  ws.getRow(1).height = 10;
  ws.mergeCells("B2:E2");
  const hCell = ws.getRow(2).getCell(2);
  hCell.value = `${data.nomeEmpresa} — Premissas`;
  hCell.font = { bold: true, size: 14, color: { argb: CF.DOURADO }, name: "Arial" };
  hCell.fill = cfFill(CF.PRETO);
  hCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(2).height = 30;

  let row = 4;

  // Section 01: Proposta
  cfSectionTitle(ws, row, 2, "01 · Valores da proposta", 5);
  row++;
  cfTableHeader(ws, row, ["Parâmetro", "Valor", "Categoria", "Observação"]);
  row++;
  const sec1 = [
    ["Nome da empresa", data.nomeEmpresa, "Identificação", ""],
    ["CNPJ", data.cnpj || "—", "Identificação", "Editável"],
    ["Produto/serviço", data.produto, "Produto", ""],
    ["Modelo de negócio", data.modeloNegocio, "Produto", ""],
    ["Valor de implantação (one-time)", data.valorImplantacao, "Cobrança", FMT_BRL],
    ["Taxa fixa mensal", data.taxaFixaMensal, "Cobrança", FMT_BRL],
    ["O que a taxa cobre", data.taxaFixaCobre, "Cobrança", ""],
  ];
  sec1.forEach(([k, v, cat, obs], i) => {
    const r = ws.getRow(row + i);
    r.height = 18;
    r.getCell(2).value = k;
    r.getCell(2).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    cfInputCell(r.getCell(3), v, typeof v === "number" ? (obs as string) : undefined);
    r.getCell(4).value = cat;
    r.getCell(4).font = { color: { argb: CF.CINZA }, italic: true, name: "Arial", size: 9 };
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).value = obs;
    r.getCell(5).font = { color: { argb: CF.CINZA }, italic: true, name: "Arial", size: 9 };
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
  });
  row += sec1.length + 2;

  // Section 02: Custos
  cfSectionTitle(ws, row, 2, "02 · Custos fixos mensais", 5);
  row++;
  cfTableHeader(ws, row, ["Item", "Valor mensal", "Categoria", "Observação"]);
  row++;
  data.custos.forEach((c, i) => {
    const r = ws.getRow(row + i);
    r.height = 18;
    r.getCell(2).value = c.item;
    r.getCell(2).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    cfInputCell(r.getCell(3), c.valor, FMT_BRL);
    r.getCell(4).value = c.categoria;
    r.getCell(4).font = { color: { argb: CF.CINZA }, italic: true, name: "Arial", size: 9 };
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).value = c.observacao;
    r.getCell(5).font = { color: { argb: CF.CINZA }, italic: true, name: "Arial", size: 9 };
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
  });
  const totRow = ws.getRow(row + data.custos.length);
  totRow.height = 22;
  totRow.getCell(2).value = "TOTAL CUSTOS FIXOS";
  totRow.getCell(2).font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial" };
  totRow.getCell(2).fill = cfFill(CF.PRETO_3);
  totRow.getCell(2).border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
  totRow.getCell(3).value = data.totalCustosMensal;
  totRow.getCell(3).numFmt = FMT_BRL;
  totRow.getCell(3).font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial" };
  totRow.getCell(3).fill = cfFill(CF.PRETO_3);
  totRow.getCell(3).border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
  row += data.custos.length + 3;

  // Section 03: Planos
  cfSectionTitle(ws, row, 2, "03 · Planos / pacotes recorrentes", 5);
  row++;
  cfTableHeader(ws, row, ["Plano", "Mensalidade", "Limite/escopo", "Observação"]);
  row++;
  data.planos.forEach((p, i) => {
    const r = ws.getRow(row + i);
    r.height = 18;
    r.getCell(2).value = p.nome;
    r.getCell(2).font = { bold: true, color: { argb: PLAN_COLORS[i % PLAN_COLORS.length] }, name: "Arial", size: 9 };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    cfInputCell(r.getCell(3), p.mensalidade, FMT_BRL);
    r.getCell(4).value = p.limite;
    r.getCell(4).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).value = p.observacao;
    r.getCell(5).font = { color: { argb: CF.CINZA }, italic: true, name: "Arial", size: 9 };
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
  });
  row += data.planos.length + 2;

  // Section 04: Parâmetros de crescimento
  cfSectionTitle(ws, row, 2, "04 · Parâmetros de crescimento", 5);
  row++;
  const growthParams = [
    ["Clientes iniciais (mês 1)", data.clientesIniciais, FMT_INT],
    ["Novos clientes por mês (cenário realista)", data.novosPorMes, FMT_INT],
    ["Churn mensal estimado", data.churnMensal, FMT_PCT],
    ["Alíquota de tributos", data.aliquotaTributo, FMT_PCT],
    ["Plano padrão de entrada", data.planoEntrada, undefined],
  ];
  growthParams.forEach(([k, v, fmt], i) => {
    const r = ws.getRow(row + i);
    r.height = 20;
    r.getCell(2).value = k;
    r.getCell(2).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    cfInputCell(r.getCell(3), v, fmt as string | undefined);
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
  });
  row += growthParams.length + 2;

  cfFooter(ws, row + 1, data.cnpj, 5);
}

// ── Aba 3: Planos ─────────────────────────────────────────────────────────────
function buildCfPlanos(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Planos");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: PLAN_COLORS[0] };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 3;  // color bar
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 24;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 2;

  for (let r = 1; r <= 70; r++) {
    for (let c = 1; c <= 9; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Header
  ws.mergeCells("C1:H1"); ws.getRow(1).height = 10;
  ws.mergeCells("C2:H2");
  const h = ws.getRow(2).getCell(3);
  h.value = `${data.nomeEmpresa} — Planos & Preços`;
  h.font = { bold: true, size: 14, color: { argb: CF.DOURADO }, name: "Arial" };
  h.fill = cfFill(CF.PRETO);
  ws.getRow(2).height = 30;

  let row = 4;
  cfSectionTitle(ws, row, 3, "Planos Recorrentes", 8);
  row++;
  cfTableHeader(ws, row, ["Plano", "Limite/escopo", "Mensalidade", "Taxa fixa", "Total/mês", "R$/unidade"], 3);
  row++;

  data.planos.forEach((p: PlanoItem, i: number) => {
    const planColor = PLAN_COLORS[i % PLAN_COLORS.length];
    const totalMes = p.mensalidade + data.taxaFixaMensal;
    const r = ws.getRow(row + i);
    r.height = 22;

    // Color bar
    const barCell = r.getCell(2);
    barCell.fill = cfFill(planColor);
    barCell.value = "";

    cfDataCell(r.getCell(3), p.nome, i % 2 === 0, undefined, planColor);
    (r.getCell(3) as AnyCell).font = { bold: true, color: { argb: planColor }, name: "Arial", size: 10 };
    cfDataCell(r.getCell(4), p.limite, i % 2 === 0);
    cfDataCell(r.getCell(5), p.mensalidade, i % 2 === 0, FMT_BRL);
    cfDataCell(r.getCell(6), data.taxaFixaMensal, i % 2 === 0, FMT_BRL);
    cfDataCell(r.getCell(7), totalMes, i % 2 === 0, FMT_BRL, CF.DOURADO_CLARO);
    (r.getCell(7) as AnyCell).font = { bold: true, color: { argb: CF.DOURADO_CLARO }, name: "Arial" };
    const unitVal = parseFloat(p.limite) > 0 ? totalMes / parseFloat(p.limite) : 0;
    cfDataCell(r.getCell(8), unitVal || "—", i % 2 === 0, unitVal ? FMT_BRL : undefined);
  });
  row += data.planos.length + 3;

  // One-time cards
  if (data.valorImplantacao > 0) {
    cfSectionTitle(ws, row, 3, "Valores Únicos (one-time)", 8);
    row++;
    const cardRow = ws.getRow(row);
    cardRow.height = 40;
    ws.mergeCells(`C${row}:E${row}`);
    const cardCell = cardRow.getCell(3);
    cardCell.value = `Implantação / Setup\nR$ ${data.valorImplantacao.toLocaleString("pt-BR")}`;
    cardCell.font = { bold: true, size: 12, color: { argb: CF.DOURADO }, name: "Arial" };
    cardCell.fill = cfFill(CF.PRETO_3);
    cardCell.border = { top: { style: "thick", color: { argb: CF.DOURADO } } } as never;
    cardCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row += 3;
  }

  cfFooter(ws, row + 1, data.cnpj, 8);
}

// ── Aba 4/5: Projeção 12m e 24m ───────────────────────────────────────────────
function buildCfProjecao(
  wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet },
  data: PlanilhaFinanceiraData,
  meses: ProjecaoMes[],
  tabName: string
) {
  const ws = wb.addWorksheet(tabName);
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.VERDE };
  cfSetNoGridlines(ws);

  const numMeses = meses.length;
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 28;
  for (let i = 0; i < numMeses; i++) ws.getColumn(3 + i).width = 13;
  ws.getColumn(3 + numMeses).width = 16; // TOTAL
  ws.getColumn(4 + numMeses).width = 2;

  for (let r = 1; r <= 30; r++) {
    for (let c = 1; c <= 4 + numMeses; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Header
  ws.mergeCells(`B1:${colLetter(3 + numMeses)}1`);
  const hCell = ws.getRow(1).getCell(2);
  hCell.value = `${data.nomeEmpresa} — ${tabName}`;
  hCell.font = { bold: true, size: 13, color: { argb: CF.DOURADO }, name: "Arial" };
  hCell.fill = cfFill(CF.PRETO);
  ws.getRow(1).height = 28;

  // Month headers
  const headerRow = ws.getRow(2);
  headerRow.height = 22;
  headerRow.getCell(2).value = "Métrica";
  headerRow.getCell(2).font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial" };
  headerRow.getCell(2).fill = cfFill(CF.PRETO_3);
  headerRow.getCell(2).border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
  meses.forEach((m, i) => {
    const cell = headerRow.getCell(3 + i);
    cell.value = m.mes;
    cell.font = { bold: true, size: 9, color: { argb: CF.DOURADO }, name: "Arial" };
    cell.fill = cfFill(CF.PRETO_3);
    cell.border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
    cell.alignment = { horizontal: "center" };
  });
  const totHdr = headerRow.getCell(3 + numMeses);
  totHdr.value = "TOTAL";
  totHdr.font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial" };
  totHdr.fill = cfFill(CF.PRETO_3);
  totHdr.border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
  totHdr.alignment = { horizontal: "center" };

  let row = 3;

  function addMetricRow(label: string, values: number[], fmt: string, isTotal = false, color?: string) {
    const r = ws.getRow(row);
    r.height = isTotal ? 22 : 18;
    const labelCell = r.getCell(2);
    labelCell.value = label;
    labelCell.fill = cfFill(isTotal ? CF.PRETO_3 : (row % 2 === 0 ? CF.PRETO_2 : CF.PRETO));
    labelCell.font = {
      bold: isTotal,
      color: { argb: isTotal ? (color ?? CF.DOURADO) : CF.CINZA_CLARO },
      name: "Arial",
      size: isTotal ? 10 : 9,
    };
    if (isTotal) {
      labelCell.border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
    }
    let total = 0;
    values.forEach((v, i) => {
      const cell = r.getCell(3 + i);
      cell.value = v;
      cell.numFmt = fmt;
      const vColor = color
        ? color
        : v >= 0 ? CF.BRANCO : CF.VERMELHO;
      cell.font = {
        bold: isTotal,
        color: { argb: isTotal ? (color ?? CF.DOURADO) : vColor },
        name: "Arial",
        size: 9,
      };
      cell.fill = cfFill(isTotal ? CF.PRETO_3 : (row % 2 === 0 ? CF.PRETO_2 : CF.PRETO));
      cell.alignment = { horizontal: "right" };
      if (isTotal) cell.border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
      total += v;
    });
    const totCell = r.getCell(3 + numMeses);
    totCell.value = total;
    totCell.numFmt = fmt;
    totCell.font = { bold: true, color: { argb: color ?? CF.DOURADO_CLARO }, name: "Arial", size: 9 };
    totCell.fill = cfFill(CF.PRETO_3);
    totCell.border = { top: cfBorderGold("thin"), bottom: cfBorderGold("thin") } as never;
    totCell.alignment = { horizontal: "right" };
    row++;
  }

  function addSectionHeader(label: string) {
    const r = ws.getRow(row);
    r.height = 20;
    ws.mergeCells(`B${row}:${colLetter(3 + numMeses)}${row}`);
    const cell = r.getCell(2);
    cell.value = label;
    cell.font = { bold: true, size: 10, color: { argb: CF.DOURADO }, name: "Arial" };
    cell.fill = cfFill(CF.PRETO_2);
    cell.border = { bottom: cfBorderGold("medium") } as never;
    row++;
  }

  addSectionHeader("◆ Base de Clientes");
  addMetricRow("Clientes ativos", meses.map(m => m.clientesAtivos), FMT_INT);
  addMetricRow("Novos clientes no mês", meses.map(m => m.novosClientes), FMT_INT);
  row++; // spacing

  addSectionHeader("◆ Receitas");
  addMetricRow("Receita mensalidades", meses.map(m => m.receitaMensalidade), FMT_BRL);
  addMetricRow("Receita implantação", meses.map(m => m.receitaImplantacao), FMT_BRL);
  addMetricRow("TOTAL RECEITA", meses.map(m => m.totalReceita), FMT_BRL, true, CF.VERDE);
  row++;

  addSectionHeader("◆ Custos");
  addMetricRow("Total custos fixos", meses.map(m => m.totalCustos), FMT_BRL);
  row++;

  addSectionHeader("◆ Resultado");
  addMetricRow("LUCRO LÍQUIDO", meses.map(m => m.lucroLiquido), FMT_BRL, true);
  addMetricRow("Margem (%)", meses.map(m => m.margem), FMT_PCT, false, CF.CINZA_CLARO);
  addMetricRow("Caixa acumulado", meses.map(m => m.caixaAcumulado), FMT_BRL, false, CF.DOURADO_CLARO);
  row++;

  cfFooter(ws, row + 1, data.cnpj, 3 + numMeses);
}

// ── Aba 6: Break-even ─────────────────────────────────────────────────────────
function buildCfBreakeven(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Break-even");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.LARANJA };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 2;

  for (let r = 1; r <= 40; r++) {
    for (let c = 1; c <= 6; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Card central — custo fixo total
  ws.getRow(2).height = 10;
  ws.mergeCells("B3:E3");
  const costLabel = ws.getRow(3).getCell(2);
  costLabel.value = "Custo Fixo Mensal Total";
  costLabel.font = { size: 10, color: { argb: CF.CINZA_CLARO }, name: "Arial" };
  costLabel.fill = cfFill(CF.PRETO_3);
  costLabel.alignment = { horizontal: "center" };
  ws.getRow(3).height = 22;

  ws.mergeCells("B4:E4");
  const costVal = ws.getRow(4).getCell(2);
  costVal.value = data.totalCustosMensal;
  costVal.numFmt = FMT_BRL;
  costVal.font = { bold: true, size: 28, color: { argb: CF.DOURADO }, name: "Arial" };
  costVal.fill = cfFill(CF.PRETO_3);
  costVal.border = { top: { style: "thick", color: { argb: CF.DOURADO } }, bottom: { style: "thick", color: { argb: CF.DOURADO } } } as never;
  costVal.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(4).height = 50;

  ws.mergeCells("B5:E5");
  const costSub = ws.getRow(5).getCell(2);
  costSub.value = "por mês para cobrir custos fixos de operação";
  costSub.font = { italic: true, size: 9, color: { argb: CF.CINZA }, name: "Arial" };
  costSub.fill = cfFill(CF.PRETO_3);
  costSub.alignment = { horizontal: "center" };
  ws.getRow(5).height = 20;

  // Table
  let row = 7;
  cfSectionTitle(ws, row, 2, "Clientes necessários por plano para atingir break-even", 5);
  row++;
  cfTableHeader(ws, row, ["Plano", "Total/mês (R$)", "Clientes p/ break-even", "Receita no break-even"], 2);
  row++;

  data.breakeven.forEach((b, i) => {
    const r = ws.getRow(row + i);
    r.height = 22;
    const planColor = PLAN_COLORS[i % PLAN_COLORS.length];
    r.getCell(2).value = b.plano;
    r.getCell(2).font = { bold: true, color: { argb: planColor }, name: "Arial" };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(3).value = b.totalMes;
    r.getCell(3).numFmt = FMT_BRL;
    r.getCell(3).font = { color: { argb: CF.BRANCO }, name: "Arial" };
    r.getCell(3).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(3).alignment = { horizontal: "right" };
    r.getCell(4).value = b.clientesNecessarios;
    r.getCell(4).numFmt = FMT_INT;
    r.getCell(4).font = { bold: true, color: { argb: CF.DOURADO_CLARO }, name: "Arial" };
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(4).alignment = { horizontal: "right" };
    r.getCell(5).value = b.receitaNoBreakeven;
    r.getCell(5).numFmt = FMT_BRL;
    r.getCell(5).font = { color: { argb: CF.VERDE }, name: "Arial" };
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).alignment = { horizontal: "right" };
  });
  row += data.breakeven.length + 2;

  // Nota
  ws.mergeCells(`B${row}:E${row}`);
  const nota = ws.getRow(row).getCell(2);
  nota.value = "▸ Valores one-time (implantação) não estão inclusos no cálculo acima. Break-even considera apenas receita recorrente mensal.";
  nota.font = { italic: true, size: 9, color: { argb: CF.CINZA }, name: "Arial" };
  nota.fill = cfFill(CF.PRETO_2);
  ws.getRow(row).height = 20;
  row += 2;

  cfFooter(ws, row, data.cnpj, 5);
}

// ── Aba 7: Comparativo ────────────────────────────────────────────────────────
function buildCfComparativo(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Comparativo");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.CIANO };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 14;
  ws.getColumn(10).width = 2;

  for (let r = 1; r <= 40; r++) {
    for (let c = 1; c <= 10; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Header
  ws.mergeCells("B1:I1"); ws.getRow(1).height = 10;
  ws.mergeCells("B2:I2");
  const h = ws.getRow(2).getCell(2);
  h.value = `${data.nomeEmpresa} — Comparativo de Planos`;
  h.font = { bold: true, size: 14, color: { argb: CF.DOURADO }, name: "Arial" };
  h.fill = cfFill(CF.PRETO);
  ws.getRow(2).height = 28;

  let row = 4;
  cfSectionTitle(ws, row, 2, "Análise comparativa por plano", 9);
  row++;
  cfTableHeader(ws, row, ["Plano", "Limite", "Mensalidade", "Taxa fixa", "Total/mês", "R$/unidade", "% custo coberto", "Δ vs anterior"], 2);
  row++;

  let prevTotal = 0;
  data.planos.forEach((p, i) => {
    const planColor = PLAN_COLORS[i % PLAN_COLORS.length];
    const totalMes = p.mensalidade + data.taxaFixaMensal;
    const coberturaPorc = data.totalCustosMensal > 0 ? totalMes / data.totalCustosMensal : 0;
    const delta = i === 0 ? null : totalMes - prevTotal;
    const r = ws.getRow(row + i);
    r.height = 22;

    r.getCell(2).value = p.nome;
    r.getCell(2).font = { bold: true, color: { argb: planColor }, name: "Arial" };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);

    r.getCell(3).value = p.limite;
    r.getCell(3).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(3).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);

    r.getCell(4).value = p.mensalidade;
    r.getCell(4).numFmt = FMT_BRL;
    r.getCell(4).font = { color: { argb: CF.BRANCO }, name: "Arial" };
    r.getCell(4).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(4).alignment = { horizontal: "right" };

    r.getCell(5).value = data.taxaFixaMensal;
    r.getCell(5).numFmt = FMT_BRL;
    r.getCell(5).font = { color: { argb: CF.BRANCO }, name: "Arial" };
    r.getCell(5).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(5).alignment = { horizontal: "right" };

    r.getCell(6).value = totalMes;
    r.getCell(6).numFmt = FMT_BRL;
    r.getCell(6).font = { bold: true, color: { argb: CF.DOURADO_CLARO }, name: "Arial" };
    r.getCell(6).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(6).alignment = { horizontal: "right" };

    const limitNum = parseFloat(p.limite) || 0;
    r.getCell(7).value = limitNum > 0 ? totalMes / limitNum : "—";
    if (limitNum > 0) r.getCell(7).numFmt = FMT_BRL;
    r.getCell(7).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial" };
    r.getCell(7).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(7).alignment = { horizontal: "right" };

    r.getCell(8).value = coberturaPorc;
    r.getCell(8).numFmt = FMT_PCT;
    r.getCell(8).font = { color: { argb: coberturaPorc >= 1 ? CF.VERDE : CF.LARANJA }, name: "Arial" };
    r.getCell(8).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(8).alignment = { horizontal: "right" };

    r.getCell(9).value = delta !== null ? delta : "base";
    if (delta !== null) r.getCell(9).numFmt = FMT_BRL;
    r.getCell(9).font = {
      color: { argb: delta === null ? CF.CINZA : delta >= 0 ? CF.VERDE : CF.VERMELHO },
      name: "Arial",
    };
    r.getCell(9).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    r.getCell(9).alignment = { horizontal: "right" };

    prevTotal = totalMes;
  });
  row += data.planos.length + 2;

  // Insights
  cfSectionTitle(ws, row, 2, "Insights", 9);
  row++;
  const insights = [
    `▸ Plano de maior receita por cliente: ${data.planos.reduce((a, b) => (b.mensalidade > a.mensalidade ? b : a)).nome}`,
    `▸ Break-even mais rápido: plano com maior mensalidade requer menos clientes para cobrir custos fixos.`,
    `▸ Taxa fixa mensal de R$ ${data.taxaFixaMensal.toLocaleString("pt-BR")} soma ao total de todos os planos.`,
    `▸ Custo fixo mensal: R$ ${data.totalCustosMensal.toLocaleString("pt-BR")} — calibre precificação para margem positiva.`,
  ];
  insights.forEach((text, i) => {
    ws.mergeCells(`B${row + i}:I${row + i}`);
    const cell = ws.getRow(row + i).getCell(2);
    cell.value = text;
    cell.font = { size: 9, color: { argb: CF.CINZA_CLARO }, name: "Arial" };
    cell.fill = cfFill(CF.PRETO_2);
    ws.getRow(row + i).height = 18;
  });
  row += insights.length + 2;

  cfFooter(ws, row, data.cnpj, 9);
}

// ── Aba 8: Simulações ─────────────────────────────────────────────────────────
function buildCfSimulacoes(wb: { addWorksheet: (n: string, opts?: unknown) => AnyWorksheet }, data: PlanilhaFinanceiraData) {
  const ws = wb.addWorksheet("Simulações");
  (ws as unknown as { tabColor?: { argb: string } }).tabColor = { argb: CF.ROXO };
  cfSetNoGridlines(ws);
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 2;

  for (let r = 1; r <= 50; r++) {
    for (let c = 1; c <= 6; c++) {
      (ws.getRow(r).getCell(c) as AnyCell).fill = cfFill(CF.PRETO);
    }
  }

  // Header
  ws.mergeCells("B1:E1"); ws.getRow(1).height = 10;
  ws.mergeCells("B2:E2");
  const h = ws.getRow(2).getCell(2);
  h.value = `${data.nomeEmpresa} — Simulações de Crescimento`;
  h.font = { bold: true, size: 14, color: { argb: CF.DOURADO }, name: "Arial" };
  h.fill = cfFill(CF.PRETO);
  ws.getRow(2).height = 28;

  // Scenario headers
  const scenColors = [CF.VERMELHO, CF.DOURADO, CF.VERDE];
  const scenLabels = ["Pessimista", "Realista", "Otimista"];

  let row = 4;
  const hRow = ws.getRow(row);
  hRow.height = 24;
  hRow.getCell(2).value = "Parâmetro / Resultado";
  hRow.getCell(2).font = { bold: true, color: { argb: CF.DOURADO }, name: "Arial" };
  hRow.getCell(2).fill = cfFill(CF.PRETO_3);
  hRow.getCell(2).border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
  scenLabels.forEach((label, i) => {
    const cell = hRow.getCell(3 + i);
    cell.value = label;
    cell.font = { bold: true, color: { argb: scenColors[i] }, name: "Arial" };
    cell.fill = cfFill(CF.PRETO_3);
    cell.border = {
      top: cfBorderGold("medium"),
      bottom: cfBorderGold("medium"),
      left: { style: "thick", color: { argb: scenColors[i] } },
    } as never;
    cell.alignment = { horizontal: "center" };
  });
  row++;

  // Map simulations to pessimista/realista/otimista order
  const ordered = ["Pessimista", "Realista", "Otimista"].map(
    (c) => data.simulacoes.find((s) => s.cenario === c) ?? data.simulacoes[0]
  );

  const inputParams: Array<{ label: string; key: keyof (typeof ordered)[0]; fmt?: string }> = [
    { label: "Clientes iniciais", key: "clientesIniciais", fmt: FMT_INT },
    { label: "Novos clientes/mês", key: "novosPorMes", fmt: FMT_INT },
    { label: "Churn mensal", key: "churnMensal", fmt: FMT_PCT },
  ];

  cfSectionTitle(ws, row, 2, "— Parâmetros (editáveis) —", 5);
  row++;

  inputParams.forEach(({ label, key, fmt }, i) => {
    const r = ws.getRow(row + i);
    r.height = 20;
    r.getCell(2).value = label;
    r.getCell(2).font = { color: { argb: CF.CINZA_CLARO }, name: "Arial", size: 9 };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    ordered.forEach((s, si) => {
      cfInputCell(r.getCell(3 + si), s[key], fmt);
      (r.getCell(3 + si) as AnyCell).border = {
        ...((r.getCell(3 + si) as AnyCell).border as object ?? {}),
        left: { style: "thick", color: { argb: scenColors[si] } },
      } as never;
    });
  });
  row += inputParams.length;

  // Divider
  ws.mergeCells(`B${row}:E${row}`);
  const divRow = ws.getRow(row);
  divRow.height = 6;
  for (let c = 2; c <= 5; c++) {
    divRow.getCell(c).fill = cfFill(CF.PRETO);
    (divRow.getCell(c) as AnyCell).border = { bottom: { style: "medium", color: { argb: CF.DOURADO_ESCURO } } } as never;
  }
  row++;

  cfSectionTitle(ws, row, 2, "— Resultados projetados (M12) —", 5);
  row++;

  const resultParams: Array<{ label: string; key: keyof (typeof ordered)[0]; fmt: string; big?: boolean; color?: string }> = [
    { label: "Clientes finais (M12)", key: "clientesFinaisM12", fmt: FMT_INT },
    { label: "Receita do M12", key: "receitaM12", fmt: FMT_BRL },
    { label: "Receita acumulada", key: "receitaAcumulada", fmt: FMT_BRL },
    { label: "Custo acumulado", key: "custoAcumulado", fmt: FMT_BRL, color: CF.VERMELHO },
    { label: "LUCRO ACUMULADO 12m", key: "lucroAcumulado", fmt: FMT_BRL, big: true },
    { label: "Margem (%)", key: "margem", fmt: FMT_PCT },
  ];

  resultParams.forEach(({ label, key, fmt, big, color }, i) => {
    const r = ws.getRow(row + i);
    r.height = big ? 30 : 20;
    r.getCell(2).value = label;
    r.getCell(2).font = { bold: big, size: big ? 11 : 9, color: { argb: big ? CF.DOURADO : CF.CINZA_CLARO }, name: "Arial" };
    r.getCell(2).fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
    if (big) {
      r.getCell(2).border = { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } as never;
    }
    ordered.forEach((s, si) => {
      const val = s[key] as number;
      const cell = r.getCell(3 + si);
      cell.value = val;
      cell.numFmt = fmt;
      const vColor = color ?? (big ? CF.DOURADO : (val >= 0 ? CF.BRANCO : CF.VERMELHO));
      cell.font = { bold: big, size: big ? 14 : 9, color: { argb: vColor }, name: "Arial" };
      cell.fill = cfFill(i % 2 === 0 ? CF.PRETO_2 : CF.PRETO_3);
      cell.border = {
        ...(big ? { top: cfBorderGold("medium"), bottom: cfBorderGold("medium") } : {}),
        left: { style: "thick", color: { argb: scenColors[si] } },
      } as never;
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });
  });
  row += resultParams.length + 2;

  // Nota
  ws.mergeCells(`B${row}:E${row}`);
  const nota = ws.getRow(row).getCell(2);
  nota.value = "▸ Estimativa com base em fórmula geométrica (churn + crescimento). Valores sujeitos a variação real do mercado.";
  nota.font = { italic: true, size: 8, color: { argb: CF.CINZA }, name: "Arial" };
  nota.fill = cfFill(CF.PRETO_2);
  ws.getRow(row).height = 18;
  row += 2;

  cfFooter(ws, row, data.cnpj, 5);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportPlanilhaFinanceira(data: PlanilhaFinanceiraData): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hono IA Enterprise";
  wb.created = new Date();

  buildCfDashboard(wb as never, data);
  buildCfPremissas(wb as never, data);
  buildCfPlanos(wb as never, data);
  buildCfProjecao(wb as never, data, data.projecao12m, "Projeção 12m");
  buildCfProjecao(wb as never, data, data.projecao24m, "Projeção 24m");
  buildCfBreakeven(wb as never, data);
  buildCfComparativo(wb as never, data);
  buildCfSimulacoes(wb as never, data);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const slug = (s: string) => s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
  saveAs(blob, `${slug(data.nomeEmpresa)}_Controle_Financeiro_${slug(data.produto)}.xlsx`);
}

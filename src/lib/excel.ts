import type { Proposal, Transaction } from "./db";
import type { FinancialMonth, Milestone, ReportContent, ReportOptions, RiskItem, StrategicItem } from "./claude";

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

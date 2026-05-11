import Anthropic from "@anthropic-ai/sdk";
import type { Proposal, Transaction } from "./db";

const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || "claude-sonnet-4-6";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  // Browser mode exposes the VITE_ API key in the client bundle. Keep this for
  // the current frontend-only flow; move calls server-side before public use.
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `Você é um especialista em criação de propostas comerciais em português brasileiro.
Crie propostas profissionais, claras e convincentes. O tom deve ser executivo, direto e confiante.
Nunca use linguagem genérica ou vazia. Seja específico com base nas informações fornecidas.`;

export type DocumentSection = {
  id: string;
  heading: string;
  content: string;
};

export type ProposalForm = {
  clienteNome: string;
  servicoPrincipal: string;
  objetivo: string;
  entregaveis: string;
  prazo: string;
  criterios: string;
  valorTotal: string;
  condicao: string;
  observacoes: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function getClaudeErrorMessage(error: unknown, action = "processar IA"): string {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
    return `Erro ao ${action}: chave Anthropic ausente. Configure VITE_ANTHROPIC_API_KEY no .env.`;
  }

  const status = isRecord(error) && typeof error.status === "number" ? error.status : undefined;
  const type =
    isRecord(error) && isRecord(error.error) && typeof error.error.type === "string"
      ? error.error.type
      : isRecord(error) && typeof error.type === "string"
      ? error.type
      : undefined;
  const message =
    isRecord(error) && typeof error.message === "string"
      ? error.message
      : "A API recusou a solicitação.";
  const details = [status ? `status ${status}` : "", type].filter(Boolean).join(" / ");

  if (status === 401) return `Erro ao ${action}: chave Anthropic inválida ou expirada.`;
  if (status === 403) return `Erro ao ${action}: a chave não tem permissão para usar este recurso/modelo.`;
  if (status === 404) return `Erro ao ${action}: modelo "${CLAUDE_MODEL}" não encontrado ou indisponível para esta conta.`;
  if (status === 429) return `Erro ao ${action}: limite de uso/rate limit da Anthropic atingido.`;
  if (status && status >= 500) return `Erro ao ${action}: instabilidade temporária na Anthropic (${details}).`;

  return `Erro ao ${action}${details ? ` (${details})` : ""}: ${message}`;
}

function parseJsonSections(text: string, fallback: DocumentSection[]): DocumentSection[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed.sections ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generateDocumentSections(
  form: ProposalForm,
  templateText?: string
): Promise<DocumentSection[]> {
  const templateBlock = templateText
    ? `\n\nTEMPLATE DE ESTRUTURA (use APENAS para identificar quais seções criar e em que ordem — NÃO copie nenhum texto, empresa, serviço, valores ou conteúdo deste documento):\n---\n${templateText.slice(0, 6000)}\n---`
    : "";

  const sectionInstruction = templateText
    ? `Identifique as seções presentes no template acima (seus nomes e ordem). Crie a proposta usando exatamente essa estrutura de seções. Gere TODO o conteúdo textual do zero, baseado exclusivamente nos dados do cliente informados acima.

Retorne APENAS um objeto JSON (sem markdown, sem texto adicional):
{"sections": [{"id": "1", "heading": "[nome da seção do template]", "content": "..."}, ...]}`
    : `Retorne APENAS um objeto JSON (sem markdown, sem texto adicional) com esta estrutura:
{
  "sections": [
    {"id": "1", "heading": "Apresentação", "content": "..."},
    {"id": "2", "heading": "Sobre o Projeto", "content": "..."},
    {"id": "3", "heading": "Escopo e Entregáveis", "content": "..."},
    {"id": "4", "heading": "Metodologia e Cronograma", "content": "..."},
    {"id": "5", "heading": "Investimento", "content": "..."},
    {"id": "6", "heading": "Condições de Pagamento", "content": "..."},
    {"id": "7", "heading": "Próximos Passos", "content": "..."}
  ]
}`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Crie uma proposta comercial completa com base nestas informações:

Cliente: ${form.clienteNome}
Serviço Principal: ${form.servicoPrincipal}
Objetivo: ${form.objetivo}
Entregáveis: ${form.entregaveis}
Prazo: ${form.prazo}
Critérios de Sucesso: ${form.criterios}
Valor Total: ${form.valorTotal}
Condição de Pagamento: ${form.condicao}
Observações: ${form.observacoes}${templateBlock}

${sectionInstruction}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return parseJsonSections(text, [{ id: "1", heading: "Proposta", content: text }]);
}

export async function improveProposalFieldText(
  fieldLabel: string,
  currentText: string,
  form: ProposalForm
): Promise<string> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 900,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Melhore o campo "${fieldLabel}" de uma proposta comercial em portugues brasileiro.

Contexto da proposta:
Cliente: ${form.clienteNome || "Nao informado"}
Servico Principal: ${form.servicoPrincipal || "Nao informado"}
Objetivo: ${form.objetivo || "Nao informado"}
Entregaveis: ${form.entregaveis || "Nao informado"}
Prazo: ${form.prazo || "Nao informado"}
Criterios de Sucesso: ${form.criterios || "Nao informado"}
Valor Total: ${form.valorTotal || "Nao informado"}
Condicao de Pagamento: ${form.condicao || "Nao informado"}
Observacoes: ${form.observacoes || "Nao informado"}

Texto atual do campo:
${currentText || "(campo vazio)"}

Retorne apenas o novo texto para este campo, sem titulo, sem markdown e sem explicacoes. Preserve dados objetivos como valores, prazos e nomes quando existirem. Se o campo estiver vazio, crie uma sugestao especifica usando somente o contexto informado.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text.trim() : currentText;
}

export async function generateSectionContent(
  heading: string,
  form: ProposalForm
): Promise<string> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Escreva o conteúdo para a seção "${heading}" de uma proposta comercial.
Cliente: ${form.clienteNome}
Serviço: ${form.servicoPrincipal}
Objetivo: ${form.objetivo}
Valor: ${form.valorTotal}

Retorne apenas o texto da seção, sem heading, sem markdown de títulos. Seja profissional e direto.`,
      },
    ],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function refineDocumentSections(
  sections: DocumentSection[],
  instruction: string
): Promise<DocumentSection[]> {
  const currentContent = sections.map((s) => `## ${s.heading}\n${s.content}`).join("\n\n");

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Esta é a proposta atual dividida em seções:\n\n${currentContent}\n\n---
Aplique esta modificação: ${instruction}

Retorne APENAS um JSON (sem texto adicional) com esta estrutura, mantendo os IDs originais:
{"sections": [{"id": "...", "heading": "...", "content": "..."}, ...]}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return parseJsonSections(text, sections);
}

// ── Report types ──────────────────────────────────────────────────────────────

export type SheetKey = "resumo" | "financeiro" | "milestones" | "estrategia" | "fluxo" | "riscos";

export type FinancialMonth = {
  mes: string;
  receita: number;
  despesa: number;
  liquido: number;
  acumulado: number;
};

export type Milestone = {
  fase: string;
  descricao: string;
  inicio: string;
  fim: string;
  responsavel: string;
  status: "planejado" | "em andamento" | "concluído";
};

export type StrategicItem = {
  tema: string;
  descricao: string;
  prioridade: "Alta" | "Média" | "Baixa";
  prazo: string;
};

export type RiskItem = {
  risco: string;
  probabilidade: "Alta" | "Média" | "Baixa";
  impacto: "Alto" | "Médio" | "Baixo";
  mitigacao: string;
};

export type ReportContent = {
  financeiro?: FinancialMonth[];
  milestones?: Milestone[];
  estrategia?: StrategicItem[];
  riscos?: RiskItem[];
};

export type ReportOptions = { sheets: SheetKey[]; proposalId: string | "geral" };

const REPORT_SYSTEM_PROMPT = `Você é um analista financeiro e estratégico sênior especializado em empresas de serviços brasileiras.
Gere dados estruturados e realistas em JSON para relatórios executivos em português brasileiro.
Baseie-se exclusivamente nos dados fornecidos. Seja específico, numérico e profissional.
Nunca invente clientes, contratos ou valores não informados.`;

function parseReportJson(text: string): ReportContent {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[0]);
    return {
      financeiro: Array.isArray(parsed.financeiro) ? parsed.financeiro : undefined,
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : undefined,
      estrategia: Array.isArray(parsed.estrategia) ? parsed.estrategia : undefined,
      riscos: Array.isArray(parsed.riscos) ? parsed.riscos : undefined,
    };
  } catch {
    return {};
  }
}

export async function generateReportContent(
  proposal: Proposal | null,
  transactions: Transaction[],
  options: ReportOptions
): Promise<ReportContent> {
  const aiSheets: SheetKey[] = ["financeiro", "milestones", "estrategia", "riscos"];
  const sheetsNeedingAI = options.sheets.filter((s) => aiSheets.includes(s));
  if (sheetsNeedingAI.length === 0) return {};

  const relevantTx = proposal
    ? transactions.filter((t) => t.clienteNome === proposal.clienteNome)
    : transactions;
  const txLines = relevantTx
    .slice(0, 40)
    .map((t) => `[${t.data}, ${t.kind}, R$ ${t.valor}, ${t.status}]`)
    .join("\n");

  const proposalBlock = proposal
    ? `PROPOSTA:
Cliente: ${proposal.clienteNome}
Serviço: ${proposal.servicoPrincipal}
Valor Total: ${proposal.valorTotal}
Prazo: ${proposal.prazo}
Entregáveis: ${proposal.entregaveis.slice(0, 600)}
Objetivo: ${proposal.objetivo.slice(0, 600)}`
    : `MODO: Relatório consolidado de todas as propostas e transações do workspace.`;

  const txBlock = txLines
    ? `\nTRANSAÇÕES${proposal ? ` DO CLIENTE "${proposal.clienteNome}"` : ""} (últimas ${relevantTx.slice(0, 40).length}):\n${txLines}`
    : "\nNenhuma transação registrada ainda.";

  const schemaBlocks: string[] = [];
  if (sheetsNeedingAI.includes("financeiro"))
    schemaBlocks.push(`"financeiro": [{"mes":"Mês/Ano","receita":0,"despesa":0,"liquido":0,"acumulado":0}] — 12 meses a partir de hoje, baseado no valor total da proposta distribuído pelo prazo`);
  if (sheetsNeedingAI.includes("milestones"))
    schemaBlocks.push(`"milestones": [{"fase":"","descricao":"","inicio":"DD/MM/AAAA","fim":"DD/MM/AAAA","responsavel":"","status":"planejado"}]`);
  if (sheetsNeedingAI.includes("estrategia"))
    schemaBlocks.push(`"estrategia": [{"tema":"","descricao":"","prioridade":"Alta|Média|Baixa","prazo":""}]`);
  if (sheetsNeedingAI.includes("riscos"))
    schemaBlocks.push(`"riscos": [{"risco":"","probabilidade":"Alta|Média|Baixa","impacto":"Alto|Médio|Baixo","mitigacao":""}]`);

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: REPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${proposalBlock}${txBlock}

ABAS SOLICITADAS: ${sheetsNeedingAI.join(", ")}

Retorne APENAS JSON (sem markdown, sem texto adicional):
{
${schemaBlocks.join(",\n")}
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return parseReportJson(text);
}

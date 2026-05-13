import Anthropic from "@anthropic-ai/sdk";
import type { Proposal, Transaction } from "./db";

const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || "claude-sonnet-4-6";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  // Browser mode exposes the VITE_ API key in the client bundle. Keep this for
  // the current frontend-only flow; move calls server-side before public use.
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `===============================================================================
VOCÊ É O GERADOR OFICIAL DE PROPOSTAS COMERCIAIS DA HONO IA
===============================================================================

# IDENTIDADE E CONTEXTO

Você é uma IA especializada em gerar Propostas Comerciais em PDF para a
Hono IA, uma empresa brasileira de soluções digitais e automação com IA.

DADOS FIXOS DA EMPRESA (NUNCA MUDAM, NUNCA PEÇA AO USUÁRIO):
- Nome da empresa: Hono IA
- CNPJ: 61.956.296/0001-03
- Modalidade de faturamento: Emissão de Nota Fiscal Eletrônica (NF-e)
- Identidade visual: dark theme (#0a0a0a), dourado (#d4af37), tipografia
  Inter/Helvetica, layout A4 retrato
- Logo: tigre estilizado vermelho/laranja com listras pretas e acento ciano
  (já está embutido em SVG no template HTML — não substitua, não recrie)

===============================================================================
# PROCESSO OBRIGATÓRIO
===============================================================================

Quando o usuário pedir uma proposta, você SEMPRE segue 3 fases nesta ordem:

  FASE 1 — COLETA   → fazer as perguntas estruturadas (abaixo)
  FASE 2 — REVISÃO  → mostrar resumo do que vai gerar, confirmar
  FASE 3 — GERAÇÃO  → produzir o HTML final completo

Nunca pule a Fase 1. Nunca invente dados que o usuário não forneceu.
Se faltar informação para uma seção, PERGUNTE — não preencha com placeholder.

===============================================================================
# FASE 1 — COLETA DE DADOS
===============================================================================

Faça as perguntas em blocos curtos, máximo 3-4 por vez, em ordem.
Use linguagem informal/direta em português brasileiro. Se ele já tiver
enviado um briefing com tudo, pule direto pra Fase 2.

### BLOCO A — Cliente e Projeto (obrigatório)

  A1. Nome do cliente / empresa que vai receber a proposta?
  A2. Nome do projeto/produto/sistema que está sendo proposto?
  A3. Subtítulo curto descritivo

### BLOCO B — Visão Geral (Seção 01)

  B1. Em 3-5 linhas: o que é a solução, para quem se destina, qual o
      principal valor entregue?

### BLOCO C — Funcionalidades (Seção 02)

  C1. Liste os módulos/funcionalidades principais (mínimo 4, ideal 5-6).
      Para cada um: nome curto + descrição de 1 linha.

### BLOCO D — Modelo de Entrega (Seção 03)

  D1. Quantas fases o projeto tem?
  D2. Para cada fase: nome, prazo, escopo de 1 linha.

### BLOCO E — Investimento de Implantação (Seção 04)

  E1. Valor único de implantação?
  E2. Condição de pagamento?
  E3. Observação adicional? (OPCIONAL)

### BLOCO F — Planos de Assinatura (Seção 05)

  F1. Tem planos de assinatura escalonados? (sim/não)
  F2. Qual o critério de escala? (ex.: "academias", "lojas", "usuários")
  F3. Tem taxa fixa mensal além da mensalidade? (sim/não + valor se sim)
  F4. Liste os planos (3 a 6), ordem crescente. Para cada:
       - Nome do plano, Limite, Mensalidade
  F5. Quais 3 benefícios principais o plano inclui?

### BLOCO G — Infraestrutura (Seção 06)

  G1. Texto sobre infra (2-3 linhas). Se não quiser personalizar, use
      texto padrão sobre infra em nuvem.

### BLOCO H — Serviços Adicionais (Seção 07)

  H1. Tem serviços adicionais? (OPCIONAL)
      Se sim: nome, descrição curta, valor.

### BLOCO I — Condições Finais (Seção 08)

  I1. Prazo de Entrega Inicial?
  I2. Prazo de Sistema Completo?

===============================================================================
# FASE 2 — REVISÃO
===============================================================================

Antes de gerar, mostre ao usuário um resumo em texto plano:

  📋 PROPOSTA — [Nome do Projeto] para [Cliente]

  • Seções incluídas: 01, 02, 03, 04, 05, [06], [07], 08
  • Implantação: R$ X em Yx
  • Planos: N planos, critério "Z"
  • Prazos: entrega inicial X dias / completo Y dias

  Tudo certo pra gerar? (sim / quero ajustar X)

===============================================================================
# FASE 3 — GERAÇÃO DO HTML
===============================================================================

Use EXATAMENTE o template HTML abaixo como base. Substitua apenas o conteúdo
marcado com {{PLACEHOLDERS}}. NÃO altere CSS, cores, fontes, espaçamentos,
estrutura de classes ou ordem das seções.

Se o usuário não tem planos de assinatura (F1 = não), REMOVA a seção 05
inteira da página 3. Se não tem serviços adicionais, REMOVA a seção 07.

A tabela de planos tem cores fixas por ordem:
  Plano 1 → tag-gold (#d4af37)
  Plano 2 → tag-green (#4ade80)
  Plano 3 → tag-orange (#f59e0b)
  Plano 4 → tag-amber (#fbbf24)
  Plano 5 → tag-red (#ef4444)
  Plano 6 → tag-purple (#a78bfa)

REGRAS DURAS:
1. NUNCA altere o logo, CNPJ, nome "Hono IA" ou paleta de cores.
2. NUNCA invente valores, prazos, planos ou funcionalidades.
3. NUNCA escreva fora do português brasileiro.
4. NUNCA use emojis dentro do HTML.
5. NUNCA omita o footer com CNPJ e número de página.
6. NUNCA quebre o limite de 4 páginas A4.
7. SEMPRE mantenha tom profissional, frases curtas.
8. SEMPRE confirme antes de gerar (Fase 2).
9. Produza o HTML COMPLETO (de <!DOCTYPE html> até </html>) na resposta.

TEMPLATE HTML BASE:

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta Comercial — Hono IA</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #0a0a0a; color: #e8e8e8;
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    font-size: 11pt; line-height: 1.55;
  }
  .page {
    width: 210mm; height: 297mm;
    padding: 14mm 16mm 18mm 16mm;
    position: relative; page-break-after: always;
    background: linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%);
    overflow: hidden;
  }
  .page::before {
    content: ""; position: absolute; inset: 0;
    background-image: repeating-linear-gradient(90deg,
      rgba(255,255,255,0.018) 0 1px, transparent 1px 60px);
    pointer-events: none;
  }
  .page:last-child { page-break-after: auto; }
  .cover { display: flex; flex-direction: column;
           justify-content: space-between; padding: 22mm 20mm; }
  .cover-top { display: flex; align-items: center; gap: 16px;
               border-bottom: 1px solid rgba(212,175,55,0.45);
               padding-bottom: 22px; width: 60%; }
  .logo-box { width: 64px; height: 64px; border-radius: 10px;
              background: #111; display: flex; align-items: center;
              justify-content: center; border: 1px solid rgba(255,255,255,0.06);
              overflow: hidden; padding: 4px; }
  .logo-box svg { width: 100%; height: 100%; }
  .brand-name { font-size: 22pt; font-weight: 800;
                letter-spacing: 0.5px; color: #fff; }
  .cover-title { margin-top: 70mm; }
  .cover-title h1 { font-size: 54pt; font-weight: 800;
                    line-height: 1.0; letter-spacing: -1px; color: #fff; }
  .cover-title h1 .accent { display: block; color: #d4af37; }
  .cover-subtitle { margin-top: 14px; font-size: 12pt;
                    color: #b8b8b8; letter-spacing: 0.2px; }
  .cover-footer { margin-top: auto; }
  .cover-tag { display: inline-block; padding: 10px 22px;
               border: 1px solid rgba(212,175,55,0.55); border-radius: 6px;
               font-size: 9.5pt; color: #d4af37; letter-spacing: 1px; }
  .header { display: flex; justify-content: space-between;
            align-items: center; padding-bottom: 8px;
            border-bottom: 1px solid rgba(212,175,55,0.35);
            margin-bottom: 18px; font-size: 9.5pt; letter-spacing: 1.5px; }
  .header-left .brand { color: #d4af37; font-weight: 700; }
  .header-left .sep { color: #555; margin: 0 6px; }
  .header-left .doc { color: #ccc; }
  .header-right { color: #888; font-size: 8.5pt; letter-spacing: 2px; }
  .section { margin-bottom: 16px; }
  .section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .section-number { display: inline-flex; align-items: center;
                    justify-content: center; width: 30px; height: 26px;
                    background: #d4af37; color: #0a0a0a; font-weight: 800;
                    font-size: 10pt; border-radius: 4px; }
  .section-title h2 { font-size: 17pt; font-weight: 700;
                      color: #fff; letter-spacing: 0.2px; }
  .section p { color: #cfcfcf; margin-bottom: 8px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px;
          border: 1px solid rgba(212,175,55,0.25); border-radius: 6px;
          overflow: hidden; }
  thead th { background: rgba(212,175,55,0.08); color: #d4af37;
             text-transform: uppercase; font-size: 9pt; letter-spacing: 1.2px;
             padding: 12px 14px; text-align: left;
             border-bottom: 1px solid rgba(212,175,55,0.3); }
  tbody td { padding: 9px 14px;
             border-bottom: 1px solid rgba(255,255,255,0.05);
             color: #dcdcdc; font-size: 10pt; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody td.bold { color: #fff; font-weight: 700; }
  tbody td.gold { color: #d4af37; font-weight: 700; }
  tbody.tagged td:first-child { position: relative; padding-left: 18px;
                                 font-weight: 700; color: #fff; }
  tbody.tagged td:first-child::before {
    content: ""; position: absolute; left: 6px; top: 50%;
    transform: translateY(-50%); width: 3px; height: 60%;
    background: var(--tag-color, #d4af37); border-radius: 2px;
  }
  tr.tag-gold    td:first-child::before { background: #d4af37; }
  tr.tag-green   td:first-child::before { background: #4ade80; }
  tr.tag-orange  td:first-child::before { background: #f59e0b; }
  tr.tag-amber   td:first-child::before { background: #fbbf24; }
  tr.tag-red     td:first-child::before { background: #ef4444; }
  tr.tag-purple  td:first-child::before { background: #a78bfa; }
  .highlight-box { border: 1px solid rgba(212,175,55,0.45);
                   border-radius: 10px; padding: 20px; text-align: center;
                   margin: 10px 0 4px; background: rgba(212,175,55,0.025); }
  .highlight-box .label { color: #d4af37; letter-spacing: 4px;
                          font-size: 10pt; font-weight: 700; }
  .highlight-box .value { font-size: 34pt; font-weight: 800;
                          color: #fff; margin: 8px 0 6px; letter-spacing: -0.5px; }
  .highlight-box .terms { color: #ccc; font-size: 10pt; }
  .highlight-box .note { color: #888; font-style: italic;
                         font-size: 9pt; margin-top: 6px; }
  .includes { border: 1px solid rgba(212,175,55,0.3);
              border-radius: 8px; padding: 12px 18px; margin-top: 12px; }
  .includes h4 { color: #d4af37; letter-spacing: 1.5px;
                 font-size: 9.5pt; margin-bottom: 8px; font-weight: 700; }
  .includes ul { list-style: none; }
  .includes li { color: #d8d8d8; font-size: 10pt;
                 padding: 3px 0 3px 18px; position: relative; }
  .includes li::before { content: "▸"; position: absolute;
                         left: 0; color: #d4af37; }
  .conditions { margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
  .conditions .row { display: flex; justify-content: space-between;
                     padding: 12px 4px;
                     border-bottom: 1px solid rgba(255,255,255,0.06); }
  .conditions .row .key { color: #aaa; font-size: 10pt; }
  .conditions .row .val { color: #fff; font-weight: 600; font-size: 10pt; }
  .footer { position: absolute; bottom: 8mm; left: 16mm; right: 16mm;
            display: flex; justify-content: space-between; align-items: center;
            border-top: 1px solid rgba(212,175,55,0.25);
            padding-top: 6px; font-size: 8.5pt;
            color: #888; letter-spacing: 0.3px; }
  .footer .brand-mini { color: #d4af37; font-weight: 700; }
</style>
</head>
<body>
<section class="page cover">
  <div>
    <div class="cover-top">
      <div class="logo-box">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tigerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff6b35"/>
              <stop offset="100%" stop-color="#c0392b"/>
            </linearGradient>
          </defs>
          <rect x="12" y="14" width="6" height="36" fill="url(#tigerGrad)"/>
          <rect x="46" y="14" width="6" height="36" fill="url(#tigerGrad)"/>
          <rect x="12" y="29" width="40" height="6" fill="url(#tigerGrad)"/>
          <rect x="14" y="18" width="2" height="4" fill="#0a0a0a"/>
          <rect x="14" y="26" width="2" height="3" fill="#0a0a0a"/>
          <rect x="14" y="38" width="2" height="4" fill="#0a0a0a"/>
          <rect x="14" y="45" width="2" height="3" fill="#0a0a0a"/>
          <rect x="48" y="18" width="2" height="4" fill="#0a0a0a"/>
          <rect x="48" y="26" width="2" height="3" fill="#0a0a0a"/>
          <rect x="48" y="38" width="2" height="4" fill="#0a0a0a"/>
          <rect x="48" y="45" width="2" height="3" fill="#0a0a0a"/>
          <circle cx="32" cy="32" r="3" fill="#00d4ff"/>
        </svg>
      </div>
      <div class="brand-name">HONO IA</div>
    </div>
  </div>
  <div class="cover-title">
    <h1>PROPOSTA<span class="accent">COMERCIAL</span></h1>
    <div class="cover-subtitle">{{NOME_PROJETO}} · {{SUBTITULO_PROJETO}}</div>
  </div>
  <div class="cover-footer">
    <div class="cover-tag">CNPJ 61.956.296/0001-03</div>
  </div>
</section>
<section class="page">
  <div class="header">
    <div class="header-left">
      <span class="brand">HONO IA</span><span class="sep">·</span>
      <span class="doc">PROPOSTA COMERCIAL</span>
    </div>
    <div class="header-right">CONFIDENCIAL</div>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">01</span><h2>Visão Geral</h2>
    </div>
    <p>{{TEXTO_VISAO_GERAL}}</p>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">02</span><h2>Funcionalidades da Plataforma</h2>
    </div>
    <table>
      <thead><tr><th style="width:32%;">MÓDULO</th><th>DESCRIÇÃO</th></tr></thead>
      <tbody>
        <tr><td class="bold">{{NOME_MODULO}}</td><td>{{DESC_MODULO}}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">03</span><h2>Modelo de Entrega</h2>
    </div>
    <table>
      <thead><tr>
        <th style="width:18%;">FASE</th><th style="width:22%;">PRAZO</th><th>ESCOPO</th>
      </tr></thead>
      <tbody>
        <tr><td class="bold">{{NOME_FASE}}</td><td>{{PRAZO_FASE}}</td><td>{{ESCOPO_FASE}}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <div><span class="brand-mini">Hono IA</span> · CNPJ 61.956.296/0001-03 · Documento Confidencial</div>
    <div>Página 2</div>
  </div>
</section>
<section class="page">
  <div class="header">
    <div class="header-left">
      <span class="brand">HONO IA</span><span class="sep">·</span>
      <span class="doc">PROPOSTA COMERCIAL</span>
    </div>
    <div class="header-right">CONFIDENCIAL</div>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">04</span><h2>Investimento — Implantação</h2>
    </div>
    <p>{{TEXTO_INVESTIMENTO}}</p>
    <div class="highlight-box">
      <div class="label">IMPLANTAÇÃO</div>
      <div class="value">R$ {{VALOR_IMPLANTACAO}}</div>
      <div class="terms">{{CONDICAO_PAGAMENTO}}</div>
      <div class="note">{{OBS_IMPLANTACAO}}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">05</span><h2>Planos de Assinatura</h2>
    </div>
    <p>{{TEXTO_PLANOS}}</p>
    <table>
      <thead><tr>
        <th>PLANO</th><th>{{CRITERIO_PLANOS}}</th>
        <th>MENSALIDADE</th><th>TAXA FIXA</th>
      </tr></thead>
      <tbody class="tagged">
        <tr class="{{TAG_COR}}"><td>{{NOME_PLANO}}</td><td>{{LIMITE_PLANO}}</td>
            <td class="gold">{{MENSALIDADE_PLANO}}</td><td>{{TAXA_FIXA}}</td></tr>
      </tbody>
    </table>
    <div class="includes">
      <h4>O PLANO INCLUI</h4>
      <ul>
        <li>{{BENEFICIO_1}}</li>
        <li>{{BENEFICIO_2}}</li>
        <li>{{BENEFICIO_3}}</li>
      </ul>
    </div>
  </div>
  <div class="footer">
    <div><span class="brand-mini">Hono IA</span> · CNPJ 61.956.296/0001-03 · Documento Confidencial</div>
    <div>Página 3</div>
  </div>
</section>
<section class="page">
  <div class="header">
    <div class="header-left">
      <span class="brand">HONO IA</span><span class="sep">·</span>
      <span class="doc">PROPOSTA COMERCIAL</span>
    </div>
    <div class="header-right">CONFIDENCIAL</div>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">06</span><h2>Infraestrutura e Operação</h2>
    </div>
    <p>{{TEXTO_INFRA}}</p>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">07</span><h2>Serviços Adicionais</h2>
    </div>
    <table>
      <thead><tr>
        <th style="width:28%;">SERVIÇO</th><th>DESCRIÇÃO</th><th style="width:18%;">VALOR</th>
      </tr></thead>
      <tbody>
        <tr><td class="bold">{{NOME_SERVICO}}</td>
            <td>{{DESC_SERVICO}}</td>
            <td class="gold">{{VALOR_SERVICO}}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="section">
    <div class="section-title">
      <span class="section-number">08</span><h2>Condições Comerciais</h2>
    </div>
    <div class="conditions">
      <div class="row"><span class="key">Prestador de Serviços</span><span class="val">Hono IA</span></div>
      <div class="row"><span class="key">CNPJ</span><span class="val">61.956.296/0001-03</span></div>
      <div class="row"><span class="key">Modalidade de Faturamento</span><span class="val">Emissão de Nota Fiscal Eletrônica (NF-e)</span></div>
      <div class="row"><span class="key">Prazo — Entrega Inicial</span><span class="val">{{PRAZO_ENTREGA_INICIAL}}</span></div>
      <div class="row"><span class="key">Prazo — Sistema Completo</span><span class="val">{{PRAZO_SISTEMA_COMPLETO}}</span></div>
    </div>
  </div>
  <div class="footer">
    <div><span class="brand-mini">Hono IA</span> · CNPJ 61.956.296/0001-03 · Documento Confidencial</div>
    <div>Página 4</div>
  </div>
</section>
</body>
</html>
===============================================================================`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function generateProposalResponse(messages: ChatMessage[]): Promise<string> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages,
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

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

// ── Planilha Financeira Padrão types ──────────────────────────────────────────

export type PlanoItem = {
  nome: string;
  mensalidade: number;
  limite: string;
  observacao: string;
};

export type CustoItem = {
  item: string;
  valor: number;
  categoria: string;
  observacao: string;
};

export type ProjecaoMes = {
  mes: string;
  clientesAtivos: number;
  novosClientes: number;
  receitaMensalidade: number;
  receitaImplantacao: number;
  totalReceita: number;
  totalCustos: number;
  lucroLiquido: number;
  margem: number;
  caixaAcumulado: number;
};

export type BreakevenItem = {
  plano: string;
  totalMes: number;
  clientesNecessarios: number;
  receitaNoBreakeven: number;
};

export type SimulacaoScenario = {
  cenario: "Pessimista" | "Realista" | "Otimista";
  clientesIniciais: number;
  novosPorMes: number;
  churnMensal: number;
  clientesFinaisM12: number;
  receitaM12: number;
  receitaAcumulada: number;
  custoAcumulado: number;
  lucroAcumulado: number;
  margem: number;
};

export type PlanilhaFinanceiraData = {
  nomeEmpresa: string;
  cnpj: string;
  produto: string;
  descricao: string;
  modeloNegocio: string;
  taxaFixaMensal: number;
  taxaFixaCobre: string;
  valorImplantacao: number;
  planos: PlanoItem[];
  custos: CustoItem[];
  totalCustosMensal: number;
  aliquotaTributo: number;
  clientesIniciais: number;
  novosPorMes: number;
  churnMensal: number;
  planoEntrada: string;
  projecao12m: ProjecaoMes[];
  projecao24m: ProjecaoMes[];
  breakeven: BreakevenItem[];
  simulacoes: SimulacaoScenario[];
};

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

// ── Planilha Financeira Padrão ────────────────────────────────────────────────

function parsePlanilhaJson(text: string): PlanilhaFinanceiraData | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as PlanilhaFinanceiraData;
  } catch {
    return null;
  }
}

export async function generatePlanilhaFinanceira(
  proposal: Proposal | null,
  transactions: Transaction[]
): Promise<PlanilhaFinanceiraData> {
  const relevantTx = proposal
    ? transactions.filter((t) => t.clienteNome === proposal.clienteNome)
    : transactions;

  const receitas = relevantTx
    .filter((t) => t.kind === "receita")
    .reduce((s, t) => s + (parseFloat((t.valor ?? "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0), 0);
  const despesas = relevantTx
    .filter((t) => t.kind === "despesa")
    .reduce((s, t) => s + (parseFloat((t.valor ?? "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0), 0);

  const txSample = relevantTx
    .slice(0, 30)
    .map((t) => `[${t.data}, ${t.kind}, R$ ${t.valor}, ${t.categoria || t.servico || "—"}, ${t.status}]`)
    .join("\n");

  const proposalBlock = proposal
    ? `EMPRESA/CLIENTE: ${proposal.clienteNome}
PRODUTO/SERVIÇO: ${proposal.servicoPrincipal}
DESCRIÇÃO: ${proposal.objetivo.slice(0, 300)}
VALOR TOTAL DA PROPOSTA: ${proposal.valorTotal}
PRAZO: ${proposal.prazo}
CONDIÇÃO DE PAGAMENTO: ${proposal.condicao}
ENTREGÁVEIS: ${proposal.entregaveis.slice(0, 400)}`
    : `MODO: Controle financeiro consolidado do workspace (sem proposta específica).`;

  const txBlock = txSample
    ? `\nTRANSAÇÕES REGISTRADAS (últimas ${relevantTx.slice(0, 30).length}):\nTotal receitas: R$ ${receitas.toFixed(2)} | Total despesas: R$ ${despesas.toFixed(2)}\n${txSample}`
    : "\nNenhuma transação registrada ainda.";

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: REPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${proposalBlock}${txBlock}

Com base nesses dados, gere uma planilha financeira de controle gerencial completa. Retorne APENAS JSON (sem markdown, sem texto adicional) com esta estrutura exata:

{
  "nomeEmpresa": "nome da empresa ou cliente",
  "cnpj": "CNPJ se conhecido, senão vazio",
  "produto": "nome do produto ou serviço principal",
  "descricao": "descrição em 1 linha do produto/serviço",
  "modeloNegocio": "ex: SaaS recorrente / serviço sob demanda / híbrido",
  "taxaFixaMensal": 0,
  "taxaFixaCobre": "o que a taxa fixa cobre",
  "valorImplantacao": 0,
  "planos": [
    {"nome": "Nome do Plano", "mensalidade": 0, "limite": "descrição do escopo/limite", "observacao": "obs"}
  ],
  "custos": [
    {"item": "nome do custo", "valor": 0, "categoria": "Ferramenta|Infra|Pessoal|Tributo|Marketing", "observacao": "obs"}
  ],
  "totalCustosMensal": 0,
  "aliquotaTributo": 0.06,
  "clientesIniciais": 1,
  "novosPorMes": 2,
  "churnMensal": 0.03,
  "planoEntrada": "nome do plano padrão de entrada",
  "projecao12m": [
    {
      "mes": "M1", "clientesAtivos": 1, "novosClientes": 1,
      "receitaMensalidade": 0, "receitaImplantacao": 0, "totalReceita": 0,
      "totalCustos": 0, "lucroLiquido": 0, "margem": 0, "caixaAcumulado": 0
    }
  ],
  "projecao24m": [],
  "breakeven": [
    {"plano": "Nome do Plano", "totalMes": 0, "clientesNecessarios": 0, "receitaNoBreakeven": 0}
  ],
  "simulacoes": [
    {
      "cenario": "Pessimista", "clientesIniciais": 1, "novosPorMes": 1, "churnMensal": 0.05,
      "clientesFinaisM12": 0, "receitaM12": 0, "receitaAcumulada": 0,
      "custoAcumulado": 0, "lucroAcumulado": 0, "margem": 0
    },
    {
      "cenario": "Realista", "clientesIniciais": 2, "novosPorMes": 2, "churnMensal": 0.03,
      "clientesFinaisM12": 0, "receitaM12": 0, "receitaAcumulada": 0,
      "custoAcumulado": 0, "lucroAcumulado": 0, "margem": 0
    },
    {
      "cenario": "Otimista", "clientesIniciais": 3, "novosPorMes": 4, "churnMensal": 0.01,
      "clientesFinaisM12": 0, "receitaM12": 0, "receitaAcumulada": 0,
      "custoAcumulado": 0, "lucroAcumulado": 0, "margem": 0
    }
  ]
}

Regras:
- projecao12m deve ter exatamente 12 objetos (M1 a M12) e projecao24m deve ter 24 (M1 a M24)
- Use fórmula geométrica: clientesAtivos[n] = ROUND(clientesAtivos[n-1] * (1 - churn) + novosPorMes, 0)
- caixaAcumulado é a soma acumulada dos lucroLiquido de todos os meses até aquele
- margem é lucroLiquido / totalReceita (0 se receita for 0)
- Se não houver dados suficientes, crie premissas realistas típicas do setor de serviços brasileiro
- Todos os valores numéricos devem ser numbers, nunca strings`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const parsed = parsePlanilhaJson(text);
  if (!parsed) throw new Error("Claude não retornou JSON válido para a planilha financeira.");
  return parsed;
}

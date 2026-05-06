/* Hono AI Enterprise — Dashboard Executivo (estado vazio funcional) */

const toast = (msg) => window.dispatchEvent(new CustomEvent('hono-toast', { detail: msg }));

const KPI_LABELS = [
  { label: "SALDO TOTAL", color: "var(--gold)" },
  { label: "LUCRO DO MÊS", color: "var(--red-soft)" },
  { label: "FATURAMENTO", color: "var(--gold)" },
  { label: "DESPESAS", color: "var(--red-soft)" },
];

const KPI_SECONDARY = [
  { label: "CONTAS A PAGAR" },
  { label: "CONTAS A RECEBER" },
  { label: "PROPOSTAS ABERTAS" },
  { label: "TAXA DE FECHAMENTO" },
];

const Dashboard = ({ currency, onOpenProposal, onOpenAI, onCreateProposal }) => {
  const [range, setRange] = React.useState("30D");

  return (
    <div style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Dashboard Executivo</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
            Bem-vindo, Daniel · workspace pronto, aguardando dados
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <div className="seg">
            {["24H", "7D", "30D", "QTD", "YTD", "ALL"].map(r => (
              <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn sm" onClick={() => toast("Filtros — sem dados para filtrar")}><Icon name="filter" size={11}/> Filtros</button>
          <button className="btn sm" onClick={() => toast("Exportar — workspace vazio")}><Icon name="download" size={11}/> Exportar</button>
          <button className="btn primary sm" onClick={onCreateProposal}><Icon name="plus" size={11}/> Nova entrada</button>
        </div>
      </div>

      {/* Empty hero */}
      <div className="panel" style={{ padding: 0 }}>
        <div style={{ padding: "32px 28px", display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ width: 64, height: 64, border: "1px solid var(--gold-deep)", display: "grid", placeItems: "center", color: "var(--gold)", background: "linear-gradient(135deg, rgba(201,161,74,0.08), transparent)", flexShrink: 0 }}>
            <Icon name="sparkles" size={28}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Workspace pronto, Daniel.</div>
            <div style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
              Conecte seu banco, importe um extrato OFX/CSV ou peça à IA para começar.
              Os indicadores abaixo serão preenchidos automaticamente.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn sm" onClick={() => toast("Conectar banco — em breve")}><Icon name="plus" size={11}/> Conectar banco</button>
            <button className="btn sm" onClick={() => toast("Importar extrato — selecione arquivo OFX/CSV")}><Icon name="download" size={11}/> Importar extrato</button>
            <button className="btn primary sm" onClick={onOpenAI}><Icon name="sparkles" size={11}/> Falar com IA</button>
          </div>
        </div>
      </div>

      {/* Primary KPIs — vazios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {KPI_LABELS.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">
              <span style={{ width: 6, height: 6, background: k.color, display: "inline-block" }}/>
              {k.label}
            </div>
            <div className="kpi-value" style={{ color: "var(--fg-4)" }}>
              <span className="currency">{currency === "USD" ? "$" : "R$"}</span>—
            </div>
            <div className="kpi-meta">
              <Pill tone="neutral">SEM DADOS</Pill>
              <span>aguardando importação</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, minHeight: 280 }}>
        <div className="panel">
          <div className="panel-header">
            <span className="title">EVOLUÇÃO FINANCEIRA</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>· 12M</span>
            <div className="actions">
              <button className="btn sm ghost" onClick={() => toast("Configurar gráfico")}>Configurar</button>
            </div>
          </div>
          <div className="empty-state">
            <div className="glyph"><Icon name="trend_up" size={24}/></div>
            <div>Nenhum lançamento registrado</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 320, textAlign: "center" }}>
              O gráfico de evolução aparecerá quando houver pelo menos 7 dias de dados.
            </div>
            <button className="btn sm" onClick={() => toast("Importar extrato — selecione arquivo")} style={{ marginTop: 8 }}>
              <Icon name="download" size={11}/> Importar extrato
            </button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="title">LUCRO × DESPESA</span>
          </div>
          <div className="empty-state">
            <div className="glyph">∅</div>
            <div>Sem comparativo</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)" }}>
              Aguardando primeiro fechamento mensal.
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        {KPI_SECONDARY.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: 18, color: "var(--fg-4)" }}>—</div>
            <div className="kpi-meta">
              <Pill tone="neutral">VAZIO</Pill>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12, minHeight: 280 }}>
        <div className="panel">
          <div className="panel-header">
            <span className="title">PROPOSTAS RECENTES</span>
            <div className="actions">
              <button className="btn sm" onClick={onCreateProposal}><Icon name="plus" size={11}/> Criar</button>
            </div>
          </div>
          <div className="empty-state">
            <div className="glyph"><Icon name="proposals" size={24}/></div>
            <div>Nenhuma proposta criada</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 320, textAlign: "center" }}>
              Use a IA para gerar sua primeira proposta em menos de 1 minuto.
            </div>
            <button className="btn primary sm" onClick={onCreateProposal} style={{ marginTop: 8 }}>
              <Icon name="sparkles" size={11}/> Criar com IA
            </button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><span className="title">DESPESAS POR CATEGORIA</span></div>
          <div className="empty-state">
            <div className="glyph">%</div>
            <div>Sem categorias ativas</div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="title">CALENDÁRIO FINANCEIRO</span>
            <div className="actions">
              <button className="btn sm ghost" onClick={() => toast("Mês anterior")}><Icon name="chev_left" size={11}/></button>
              <button className="btn sm ghost" onClick={() => toast("Próximo mês")}><Icon name="chev_right" size={11}/></button>
            </div>
          </div>
          <div className="empty-state">
            <div className="glyph"><Icon name="calendar" size={22}/></div>
            <div>Sem eventos agendados</div>
            <button className="btn sm" onClick={() => toast("Agendar evento")} style={{ marginTop: 6 }}>
              <Icon name="plus" size={11}/> Agendar
            </button>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, minHeight: 200 }}>
        <div className="panel">
          <div className="panel-header"><span className="title">ATIVIDADE OPERACIONAL</span></div>
          <div className="empty-state">
            <div className="glyph">⎯</div>
            <div>Nenhum lançamento registrado</div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><span className="title">ATIVIDADE</span></div>
          <div className="empty-state">
            <div className="glyph">·</div>
            <div>Sem eventos recentes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard });

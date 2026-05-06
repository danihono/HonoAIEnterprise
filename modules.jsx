/* Hono AI Enterprise — módulos secundários (estados vazios funcionais) */

const modToast = (m) => window.dispatchEvent(new CustomEvent('hono-toast', { detail: m }));

const FinanceiroModule = ({ currency, onCreateProposal }) => {
  const [tab, setTab] = React.useState("receitas");
  const tabs = [
    { id: "receitas", label: "Receitas" },
    { id: "despesas", label: "Despesas" },
    { id: "fluxo", label: "Fluxo de Caixa" },
    { id: "categorias", label: "Categorias" },
    { id: "dre", label: "DRE" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="tabbed-nav">
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
          <button className="btn sm" onClick={() => modToast("Filtros — sem dados")}><Icon name="filter" size={11}/> Filtros</button>
          <button className="btn sm" onClick={() => modToast("Exportar Excel — workspace vazio")}><Icon name="download" size={11}/> Excel</button>
          <button className="btn primary sm" onClick={() => modToast(`Novo ${tab === "despesas" ? "lançamento" : "recebimento"} — formulário em breve`)}>
            <Icon name="plus" size={11}/> Novo {tab === "despesas" ? "lançamento" : "recebimento"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "var(--gap)" }}>
        {[
          { l: tab === "despesas" ? "TOTAL DESPESAS" : "TOTAL RECEITAS" },
          { l: "RECORRENTE" },
          { l: "PENDENTE" },
          { l: "ATRASADO" },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value" style={{ color: "var(--fg-4)" }}>
              <span className="currency">{currency === "USD" ? "$" : "R$"}</span>—
            </div>
            <div className="kpi-meta"><Pill tone="neutral">SEM DADOS</Pill></div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ margin: "0 var(--gap) var(--gap)", flex: 1, minHeight: 0 }}>
        <div className="panel-header">
          <span className="title">{tab === "despesas" ? "DESPESAS" : tab === "receitas" ? "RECEITAS" : tab.toUpperCase()}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>· 0 REGISTROS</span>
        </div>
        <div className="empty-state">
          <div className="glyph"><Icon name="finance" size={28}/></div>
          <div>Nenhum lançamento registrado</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 360, textAlign: "center" }}>
            Importe um extrato bancário (OFX/CSV) ou conecte seu banco via Open Finance para começar.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn sm" onClick={() => modToast("Importar extrato")}><Icon name="download" size={11}/> Importar</button>
            <button className="btn primary sm" onClick={() => modToast("Conectar banco — em breve")}><Icon name="plus" size={11}/> Conectar banco</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientesModule = () => (
  <div style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)", height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Clientes</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>0 cadastros · workspace vazio</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="btn sm" onClick={() => modToast("Importar CSV de clientes")}><Icon name="download" size={11}/> Importar</button>
        <button className="btn primary sm" onClick={() => modToast("Novo cliente — formulário em breve")}><Icon name="plus" size={11}/> Novo cliente</button>
      </div>
    </div>
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header"><span className="title">CARTEIRA</span></div>
      <div className="empty-state">
        <div className="glyph"><Icon name="users" size={28}/></div>
        <div>Nenhum cliente cadastrado</div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 360, textAlign: "center" }}>
          Cadastre seus primeiros clientes manualmente ou importe um CSV. A IA enriquece automaticamente com Score, MRR e LTV.
        </div>
        <button className="btn primary sm" onClick={() => modToast("Novo cliente — formulário em breve")} style={{ marginTop: 8 }}>
          <Icon name="plus" size={11}/> Cadastrar primeiro cliente
        </button>
      </div>
    </div>
  </div>
);

const PropostasModule = ({ onCreate, onOpen }) => (
  <div style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)", height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Propostas IA</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>0 ativas · workspace vazio</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="btn sm" onClick={() => modToast("Templates — em breve")}><Icon name="docs" size={11}/> Templates</button>
        <button className="btn primary sm" onClick={onCreate}><Icon name="sparkles" size={11}/> Criar com IA</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      {[
        { l: "RASCUNHO", color: "var(--fg-3)" },
        { l: "ENVIADA", color: "var(--gold)" },
        { l: "APROVADA · MÊS", color: "var(--pos)" },
        { l: "RECUSADA · MÊS", color: "var(--red-soft)" },
      ].map((s, i) => (
        <div key={i} className="kpi">
          <div className="kpi-label"><span style={{ width: 6, height: 6, background: s.color, display: "inline-block" }}/>{s.l}</div>
          <div className="kpi-value" style={{ color: "var(--fg-4)" }}>0</div>
        </div>
      ))}
    </div>

    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header"><span className="title">PIPELINE</span></div>
      <div className="empty-state">
        <div className="glyph"><Icon name="proposals" size={28}/></div>
        <div>Nenhuma proposta criada</div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 360, textAlign: "center" }}>
          A IA gera 4 versões da sua proposta (completa, premium, resumida e apresentação) em menos de 1 minuto.
        </div>
        <button className="btn primary sm" onClick={onCreate} style={{ marginTop: 8 }}>
          <Icon name="sparkles" size={11}/> Criar primeira proposta com IA
        </button>
      </div>
    </div>
  </div>
);

const SimpleModule = ({ title, subtitle, hint, icon = "tasks" }) => (
  <div style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)", height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="btn primary sm" onClick={() => modToast(`Novo · ${title}`)}><Icon name="plus" size={11}/> Novo</button>
      </div>
    </div>
    <div className="panel" style={{ flex: 1 }}>
      <div className="empty-state">
        <div className="glyph"><Icon name={icon} size={28}/></div>
        <div>{hint}</div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 360, textAlign: "center" }}>
          Workspace vazio — comece criando o primeiro item ou importando dados.
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { FinanceiroModule, ClientesModule, PropostasModule, SimpleModule });

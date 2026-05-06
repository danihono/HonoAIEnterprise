/* Hono AI Enterprise — Command palette, Proposal flow, Drawer, Toasts */

const ovToast = (m) => window.dispatchEvent(new CustomEvent('hono-toast', { detail: m }));

const CMDK_ITEMS = [
  { sec: "NAVEGAR", items: [
    { id: "go-dashboard", label: "Ir para Dashboard", icon: "dashboard", shortcut: "⌘1", nav: "dashboard" },
    { id: "go-ai", label: "Ir para IA Central", icon: "ai", shortcut: "⌘2", nav: "ai" },
    { id: "go-fin", label: "Ir para Financeiro", icon: "finance", shortcut: "⌘3", nav: "financeiro" },
    { id: "go-cli", label: "Ir para Clientes", icon: "users", shortcut: "⌘4", nav: "clientes" },
    { id: "go-pro", label: "Ir para Propostas", icon: "proposals", shortcut: "⌘5", nav: "propostas" },
  ]},
  { sec: "AÇÕES", items: [
    { id: "new-proposal", label: "Criar proposta com IA", icon: "sparkles", shortcut: "⌘N", action: "new-proposal" },
    { id: "import-bank", label: "Importar extrato bancário", icon: "download", action: "import-bank" },
    { id: "new-client", label: "Cadastrar cliente", icon: "plus", action: "new-client" },
    { id: "open-copilot", label: "Abrir Copilot", icon: "sparkles", action: "open-copilot" },
  ]},
  { sec: "IA · PERGUNTAS RÁPIDAS", items: [
    { id: "ai-start", label: "Como começo a usar?", icon: "ai", action: "ai-start" },
    { id: "ai-import", label: "Como importo meus dados?", icon: "ai", action: "ai-import" },
    { id: "ai-features", label: "Quais funcionalidades existem?", icon: "ai", action: "ai-features" },
  ]},
];

const CommandPalette = ({ onClose, onNavigate, onAction }) => {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const all = CMDK_ITEMS.flatMap(s => s.items.map(it => ({ ...it, sec: s.sec })));
  const filtered = q.trim() ? all.filter(it => it.label.toLowerCase().includes(q.toLowerCase())) : null;
  const flatItems = filtered || all;

  React.useEffect(() => { setActive(0); }, [q]);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, flatItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const it = flatItems[active];
        if (!it) return;
        if (it.nav) onNavigate(it.nav); else if (it.action) onAction(it.action);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, flatItems, onClose, onNavigate, onAction]);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: "12vh" }}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" size={14}/>
          <input autoFocus placeholder="Buscar comandos, navegar, perguntar à IA…" value={q} onChange={e => setQ(e.target.value)}/>
          <span className="kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {filtered ? (
            <>
              <div className="cmdk-section-label">{filtered.length} resultados</div>
              {filtered.map((it, i) => (
                <div key={it.id} className={`cmdk-item ${i === active ? "active" : ""}`} onClick={() => {
                  if (it.nav) onNavigate(it.nav); else if (it.action) onAction(it.action); onClose();
                }} onMouseEnter={() => setActive(i)}>
                  <Icon name={it.icon} size={14}/>
                  <span>{it.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--fg-4)", letterSpacing: "0.1em" }}>{it.sec}</span>
                </div>
              ))}
            </>
          ) : (
            CMDK_ITEMS.map(s => (
              <div key={s.sec}>
                <div className="cmdk-section-label">{s.sec}</div>
                {s.items.map((it) => {
                  const idx = all.findIndex(a => a.id === it.id);
                  return (
                    <div key={it.id} className={`cmdk-item ${idx === active ? "active" : ""}`} onClick={() => {
                      if (it.nav) onNavigate(it.nav); else if (it.action) onAction(it.action); onClose();
                    }} onMouseEnter={() => setActive(idx)}>
                      <Icon name={it.icon} size={14}/>
                      <span>{it.label}</span>
                      {it.shortcut && <span className="cmdk-shortcut">{it.shortcut}</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--line-1)", padding: "8px 14px", display: "flex", gap: 16, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          <span>↑↓ NAVEGAR</span><span>⏎ SELECIONAR</span><span>ESC FECHAR</span>
          <span style={{ marginLeft: "auto" }}>HONO IA · ⌘K</span>
        </div>
      </div>
    </div>
  );
};

// --- Proposal flow ---
const ProposalFlow = ({ onClose, onComplete }) => {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    cliente: "",
    servico: "",
    template: "",
    objetivo: "",
    escopo: "",
    prazo: "",
    investimento: "",
    condicoes: "",
  });
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const steps = ["Cliente", "Escopo", "Investimento", "IA Gera", "Revisar"];

  const next = () => {
    if (step === 0 && !data.cliente.trim()) { ovToast("Informe o nome do cliente"); return; }
    if (step === 2) {
      setStep(3);
      setGenerating(true);
      setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
    } else if (step < steps.length - 1) setStep(step + 1);
    else { ovToast("Proposta enviada (simulação)"); onComplete(); }
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 880, height: 640 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="sparkles" size={16}/>
            <strong style={{ fontSize: 14 }}>Nova Proposta IA</strong>
            <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>· RASCUNHO</span>
          </div>
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="close" size={12}/></button>
        </div>

        <div className="stepper">
          {steps.map((s, i) => (
            <div key={s} className={`step ${step === i ? "active" : step > i ? "done" : ""}`}>
              <span className="num">{step > i ? "✓" : i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 720 }}>
              <div className="field">
                <span className="field-label">Cliente</span>
                <input className="field-input" placeholder="Nome do cliente"
                  value={data.cliente} onChange={e => setData(d => ({ ...d, cliente: e.target.value }))}/>
              </div>
              <div className="field">
                <span className="field-label">Template</span>
                <select className="field-select" value={data.template} onChange={e => setData(d => ({ ...d, template: e.target.value }))}>
                  <option value="">Selecione…</option>
                  <option value="trafego">Tráfego Pago</option>
                  <option value="dev">Desenvolvimento</option>
                  <option value="consult">Consultoria Estratégica</option>
                  <option value="branding">Branding</option>
                  <option value="auto">Automação</option>
                  <option value="gestao">Gestão Mensal</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <span className="field-label">Serviço (título da proposta)</span>
                <input className="field-input" placeholder="Ex: Gestão de tráfego pago Q3"
                  value={data.servico} onChange={e => setData(d => ({ ...d, servico: e.target.value }))}/>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <span className="field-label">Objetivo</span>
                <textarea className="field-textarea" placeholder="O que o cliente quer alcançar?"
                  value={data.objetivo} onChange={e => setData(d => ({ ...d, objetivo: e.target.value }))}/>
              </div>
              <div className="ai-chip" style={{ gridColumn: "span 2" }}>
                <span className="ai-chip-icon"><Icon name="sparkles" size={14}/></span>
                <div>
                  <strong>IA está pronta.</strong> Quanto mais contexto você der nos campos acima, mais precisa será a proposta gerada.
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
              <div className="field">
                <span className="field-label">Escopo</span>
                <textarea className="field-textarea" rows={4} placeholder="Liste entregáveis, atividades e exclusões"
                  value={data.escopo} onChange={e => setData(d => ({ ...d, escopo: e.target.value }))}/>
              </div>
              <div className="field">
                <span className="field-label">Prazo</span>
                <input className="field-input" placeholder="Ex: 90 dias"
                  value={data.prazo} onChange={e => setData(d => ({ ...d, prazo: e.target.value }))}/>
              </div>
              <div className="ai-chip">
                <span className="ai-chip-icon"><Icon name="sparkles" size={14}/></span>
                <div>
                  <strong>Dica:</strong> A IA pode gerar um cronograma sugerido a partir do prazo. Continue para receber a sugestão.
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 720 }}>
              <div className="field">
                <span className="field-label">Investimento total</span>
                <input className="field-input num" placeholder="R$ 0"
                  value={data.investimento} onChange={e => setData(d => ({ ...d, investimento: e.target.value }))}/>
              </div>
              <div className="field">
                <span className="field-label">Condições de pagamento</span>
                <input className="field-input" placeholder="Ex: 30/35/35%"
                  value={data.condicoes} onChange={e => setData(d => ({ ...d, condicoes: e.target.value }))}/>
              </div>
              <div className="ai-chip" style={{ gridColumn: "span 2" }}>
                <span className="ai-chip-icon"><Icon name="sparkles" size={14}/></span>
                <div>
                  <strong>Pronto para gerar.</strong> Ao continuar, a IA vai redigir 4 versões da proposta (completa, premium, resumida e apresentação).
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
              {generating ? (
                <>
                  <div style={{ width: 56, height: 56, border: "1px solid var(--gold-deep)", display: "grid", placeItems: "center", color: "var(--gold)" }}>
                    <Icon name="sparkles" size={26}/>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>IA gerando proposta…</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", textAlign: "center", lineHeight: 1.8 }}>
                    <div>✓ ESTRUTURANDO ESCOPO</div>
                    <div>● REDIGINDO COPY COMERCIAL...</div>
                    <div style={{ opacity: 0.4 }}>○ MONTANDO CRONOGRAMA</div>
                    <div style={{ opacity: 0.4 }}>○ GERANDO 4 VERSÕES</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 56, height: 56, border: "1px solid var(--pos)", display: "grid", placeItems: "center", color: "var(--pos)", background: "var(--pos-bg)" }}>
                    <Icon name="check" size={26}/>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Proposta gerada</div>
                  <div style={{ color: "var(--fg-3)", fontSize: 13, textAlign: "center", maxWidth: 460 }}>
                    A IA criou 4 versões. Confira no próximo passo.
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { t: "Versão Completa", desc: "Escopo detalhado · termos jurídicos", primary: true },
                { t: "Versão Premium", desc: "Design executivo · capa premium" },
                { t: "Versão Resumida", desc: "One-pager para decisor" },
                { t: "Apresentação", desc: "Pitch deck para reunião" },
              ].map((v, i) => (
                <div key={i} style={{ border: v.primary ? "1px solid var(--gold-deep)" : "1px solid var(--line-1)", background: "var(--bg-1)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="pdf" size={14}/>
                    <strong style={{ fontSize: 13 }}>{v.t}</strong>
                    {v.primary && <Pill tone="warn">RECOMENDADO</Pill>}
                  </div>
                  <div style={{ color: "var(--fg-3)", fontSize: 11.5, marginTop: 6 }}>{v.desc}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <button className="btn sm" onClick={() => ovToast(`Pré-visualizar: ${v.t}`)}>Pré-visualizar</button>
                    <button className="btn sm" onClick={() => ovToast(`PDF baixado: ${v.t}`)}><Icon name="download" size={11}/> PDF</button>
                  </div>
                </div>
              ))}
              <div className="ai-chip" style={{ gridColumn: "span 2" }}>
                <span className="ai-chip-icon"><Icon name="sparkles" size={14}/></span>
                <div>
                  <strong>Pronto para enviar.</strong> A IA pode configurar um e-mail personalizado e agendar follow-up automático.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", padding: "12px 18px", borderTop: "1px solid var(--line-1)", background: "var(--bg-1)", gap: 8 }}>
          {step > 0 && <button className="btn" onClick={prev}>← Voltar</button>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
            <button className="btn primary" onClick={next} disabled={generating}>
              {step === 2 ? "Gerar com IA →" : step === steps.length - 1 ? "Enviar proposta" : "Continuar →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Proposal drawer ---
const ProposalDrawer = ({ proposal, onClose }) => {
  if (!proposal) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line-1)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>{proposal.id || "—"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{proposal.client || "Sem cliente"}</div>
          </div>
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="close" size={12}/></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="empty-state" style={{ minHeight: 200 }}>
            <div className="glyph"><Icon name="proposals" size={26}/></div>
            <div>Proposta sem detalhes</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", maxWidth: 320, textAlign: "center" }}>
              Crie uma proposta com IA para preencher timeline, métricas e documentos.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", padding: 14, borderTop: "1px solid var(--line-1)", gap: 8 }}>
          <button className="btn" onClick={() => ovToast("Editar proposta")}>Editar</button>
          <button className="btn" onClick={() => ovToast("Proposta duplicada")}>Duplicar</button>
          <button className="btn primary" style={{ marginLeft: "auto" }} onClick={() => ovToast("Proposta reenviada")}>
            <Icon name="send" size={11}/> Reenviar
          </button>
        </div>
      </div>
    </>
  );
};

// --- Toast host ---
const ToastHost = () => {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    const onToast = (e) => {
      const id = Math.random().toString(36).slice(2);
      setToasts(t => [...t, { id, msg: e.detail }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
    };
    window.addEventListener('hono-toast', onToast);
    return () => window.removeEventListener('hono-toast', onToast);
  }, []);
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <Icon name="sparkles" size={11}/>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { CommandPalette, ProposalFlow, ProposalDrawer, ToastHost });

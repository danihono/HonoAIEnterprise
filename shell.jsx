/* Hono AI Enterprise — App shell: sidebar + topbar + statusbar */

const NAV_ITEMS = [
  { section: "OPERAÇÃO" },
  { id: "dashboard", label: "Dashboard", icon: "dashboard", badge: "" },
  { id: "ai", label: "IA Central", icon: "ai", badge: "●" },
  { section: "FINANÇAS" },
  { id: "financeiro", label: "Financeiro", icon: "finance", badge: "" },
  { id: "simuladores", label: "Simuladores", icon: "sim", badge: "" },
  { id: "relatorios", label: "Relatórios", icon: "reports", badge: "" },
  { section: "COMERCIAL" },
  { id: "clientes", label: "Clientes", icon: "users", badge: "" },
  { id: "propostas", label: "Propostas", icon: "proposals", badge: "" },
  { section: "PRODUTIVIDADE" },
  { id: "documentos", label: "Documentos", icon: "docs", badge: "" },
  { id: "tarefas", label: "Tarefas", icon: "tasks", badge: "" },
  { section: "" },
  { id: "configuracoes", label: "Configurações", icon: "settings", badge: "" },
];

const Sidebar = ({ active, onNavigate, collapsed }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">H</div>
        <div className="brand-text">
          <span>Hono AI</span>
          <small>Enterprise</small>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map((it, i) => {
          if (it.section !== undefined) {
            return it.section ? (
              <div key={i} className="sidebar-section">
                <div className="sidebar-section-label">{it.section}</div>
              </div>
            ) : <div key={i} style={{ height: 8 }}/>;
          }
          return (
            <div
              key={it.id}
              className={`sidebar-item ${active === it.id ? "active" : ""}`}
              onClick={() => onNavigate(it.id)}
              title={it.label}
            >
              <span className="sidebar-icon"><Icon name={it.icon} size={14}/></span>
              <span className="sidebar-item-label">{it.label}</span>
              {it.badge && <span className="sidebar-badge">{it.badge}</span>}
            </div>
          );
        })}
      </div>
      <div className="sidebar-footer" onClick={() => window.dispatchEvent(new CustomEvent('hono-toast', { detail: 'Perfil de Daniel' }))} style={{ cursor: 'pointer' }}>
        <div className="avatar">DA</div>
        <div className="user-meta">
          <strong>Daniel</strong>
          <small>Hono AI Enterprise</small>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ crumbs, onCmdK, onCopilot, copilotOpen, theme, onTheme, onTweakSidebar }) => {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <header className="topbar">
      <button className="topbar-action" onClick={onTweakSidebar} title="Toggle sidebar">
        <Icon name="panel_left" size={14}/>
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><Icon name="chev_right" size={11}/></span>}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-search" onClick={onCmdK}>
        <Icon name="search" size={12}/>
        <span>Buscar tudo, ações, IA…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-time">
        <span className="live-dot"/>
        <span>{date.toUpperCase()}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{time}</span>
      </div>

      <button className="topbar-action" title="Notificações" onClick={() => window.dispatchEvent(new CustomEvent('hono-toast', { detail: 'Sem notificações no momento' }))}>
        <Icon name="bell" size={13}/>
      </button>
      <button className="topbar-action" onClick={onTheme} title="Tema">
        <Icon name={theme === "light" ? "moon" : "sun"} size={13}/>
      </button>
      <button
        className={`topbar-action ${copilotOpen ? "active" : ""}`}
        onClick={onCopilot}
        title="Copilot"
      >
        <Icon name="sparkles" size={13}/>
      </button>
    </header>
  );
};

const StatusBar = ({ accent, density, bg, currency }) => {
  return (
    <footer className="statusbar">
      <span className="seg ok">● SISTEMA OPERACIONAL</span>
      <span className="seg">DB <span className="ok">CONECTADO</span></span>
      <span className="seg">IA <span className="ok">PRONTA</span></span>
      <span className="seg">SEM DADOS · AGUARDANDO IMPORTAÇÃO</span>
      <div className="right">
        <span>{currency === 'USD' ? '$ USD' : 'R$ BRL'}</span>
        <span>v2.4.1 · prod</span>
      </div>
    </footer>
  );
};

Object.assign(window, { Sidebar, Topbar, StatusBar, NAV_ITEMS });

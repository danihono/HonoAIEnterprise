import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Command,
  CreditCard,
  FileText,
  Filter,
  FolderOpen,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import React, { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Client,
  Proposal,
  Transaction,
  TransactionKind,
  addClient,
  addProposal,
  addTransaction,
  deleteClient,
  deleteProposal,
  deleteTransaction,
  subscribeClients,
  subscribeProposals,
  subscribeTransactions,
  updateProposal,
} from "./lib/db";

type PageId =
  | "dashboard"
  | "financeiro"
  | "clientes"
  | "propostas"
  | "documentos"
  | "tarefas"
  | "relatorios"
  | "configuracoes";

type Toast = {
  id: number;
  message: string;
};

type NavItem = {
  id: PageId;
  label: string;
  icon: ReactNode;
  helper: string;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, helper: "Visão financeira" },
  { id: "financeiro", label: "Financeiro", icon: <CircleDollarSign size={18} />, helper: "Receitas e custos" },
  { id: "clientes", label: "Clientes", icon: <Users size={18} />, helper: "Relacionamentos" },
  { id: "propostas", label: "Propostas", icon: <BriefcaseBusiness size={18} />, helper: "Pipeline comercial" },
  { id: "documentos", label: "Documentos", icon: <FolderOpen size={18} />, helper: "Arquivos e modelos" },
  { id: "tarefas", label: "Tarefas", icon: <CheckCircle2 size={18} />, helper: "Prioridades" },
  { id: "relatorios", label: "Relatórios", icon: <BarChart3 size={18} />, helper: "Análises" },
  { id: "configuracoes", label: "Ajustes", icon: <Settings size={18} />, helper: "Workspace" },
];

const cycleFilters = ["Ciclo atual", "Ciclo anterior", "Trimestre", "Ano"];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function parseValue(str: string): number {
  return parseFloat(str.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    const unsub1 = subscribeClients(setClients);
    const unsub2 = subscribeTransactions(setTransactions);
    const unsub3 = subscribeProposals(setProposals);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const activeLabel = navItems.find((item) => item.id === activePage)?.label ?? "Home";
  const openProposal = () => setProposalOpen(true);

  return (
    <div className={sidebarOpen ? "app-shell" : "app-shell sidebar-collapsed"}>
      <Sidebar activePage={activePage} sidebarOpen={sidebarOpen} onNavigate={setActivePage} />
      <Topbar
        activeLabel={activeLabel}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenCommand={() => setCommandOpen(true)}
        onToggleCopilot={() => setCopilotOpen((v) => !v)}
      />
      <main className="workspace">
        {activePage === "dashboard" && (
          <DashboardPage
            clients={clients}
            transactions={transactions}
            onCreateProposal={openProposal}
            onToast={showToast}
          />
        )}
        {activePage === "financeiro" && (
          <FinancePage
            transactions={transactions}
            clients={clients}
            onToast={showToast}
            onDeleteTransaction={async (id) => {
              await deleteTransaction(id);
              showToast("Lançamento removido.");
            }}
          />
        )}
        {activePage === "clientes" && (
          <ClientesPage
            clients={clients}
            onNewClient={() => setClientModalOpen(true)}
            onDeleteClient={async (id) => {
              await deleteClient(id);
              showToast("Cliente removido.");
            }}
          />
        )}
        {activePage === "propostas" && (
          <ProposalsPage
            proposals={proposals}
            onCreate={openProposal}
            onToast={showToast}
            onDeleteProposal={async (id) => {
              await deleteProposal(id);
              showToast("Proposta removida.");
            }}
            onUpdateStatus={async (id, status) => {
              await updateProposal(id, { status });
              showToast("Status atualizado.");
            }}
          />
        )}
        {activePage === "documentos" && (
          <EmptyModule
            icon={<FolderOpen size={24} />}
            title="Documentos"
            subtitle="Modelos, arquivos estratégicos e entregáveis ficam centralizados aqui."
            action="Adicionar documento"
            onAction={() => showToast("Upload de documento preparado.")}
          />
        )}
        {activePage === "tarefas" && (
          <EmptyModule
            icon={<CheckCircle2 size={24} />}
            title="Tarefas"
            subtitle="Prioridades executivas, follow-ups e rotinas de operação."
            action="Criar tarefa"
            onAction={() => showToast("Nova tarefa preparada.")}
          />
        )}
        {activePage === "relatorios" && (
          <EmptyModule
            icon={<BarChart3 size={24} />}
            title="Relatórios"
            subtitle="Relatórios claros para decisão, reunião e acompanhamento de performance."
            action="Gerar relatório"
            onAction={() => showToast("Relatório preparado.")}
          />
        )}
        {activePage === "configuracoes" && <SettingsPage onToast={showToast} />}
      </main>
      {copilotOpen && (
        <CopilotPanel onClose={() => setCopilotOpen(false)} onAsk={(msg) => showToast(msg)} />
      )}
      {commandOpen && (
        <CommandPalette
          onClose={() => setCommandOpen(false)}
          onNavigate={setActivePage}
          onCreateProposal={openProposal}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
      )}
      {proposalOpen && (
        <ProposalModal
          clients={clients}
          onClose={() => setProposalOpen(false)}
          onDone={async (data) => {
            await addProposal({ ...data, status: "rascunho" });
            setProposalOpen(false);
            showToast("Proposta criada em rascunho.");
          }}
        />
      )}
      {clientModalOpen && (
        <ClientFormModal
          onClose={() => setClientModalOpen(false)}
          onSave={async (data) => {
            await addClient(data);
            setClientModalOpen(false);
            showToast(`Cliente ${data.nome} cadastrado.`);
          }}
        />
      )}
      <ToastHost toasts={toasts} />
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  activePage,
  sidebarOpen,
  onNavigate,
}: {
  activePage: PageId;
  sidebarOpen: boolean;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Hono AI" className="brand-logo" />
        {sidebarOpen && (
          <div className="brand-copy">
            <strong>Hono AI</strong>
            <span>Executive OS</span>
          </div>
        )}
      </div>
      <nav className="nav-list" aria-label="Navegação principal">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activePage === item.id ? "nav-item active" : "nav-item"}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {sidebarOpen && (
              <span className="nav-copy">
                <span>{item.label}</span>
                <small>{item.helper}</small>
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="profile-card">
        <div className="avatar">DA</div>
        {sidebarOpen && (
          <div>
            <strong>Daniel</strong>
            <span>Workspace premium</span>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({
  activeLabel,
  sidebarOpen,
  onToggleSidebar,
  onOpenCommand,
  onToggleCopilot,
}: {
  activeLabel: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCommand: () => void;
  onToggleCopilot: () => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-button" onClick={onToggleSidebar} aria-label="Alternar menu">
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>
      <div className="page-title">
        <span>Hono AI Enterprise</span>
        <strong>{activeLabel}</strong>
      </div>
      <button className="search-trigger" onClick={onOpenCommand}>
        <Search size={16} />
        <span>Buscar páginas, ações e respostas</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="topbar-actions">
        <button className="icon-button" aria-label="Tema">
          <Moon size={17} />
        </button>
        <button className="icon-button" aria-label="Notificações">
          <Bell size={17} />
        </button>
        <button className="ai-button" onClick={onToggleCopilot}>
          <Sparkles size={16} />
          Copilot
        </button>
      </div>
    </header>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage({
  clients,
  transactions,
  onCreateProposal,
  onToast,
}: {
  clients: Client[];
  transactions: Transaction[];
  onCreateProposal: () => void;
  onToast: (msg: string) => void;
}) {
  const [range, setRange] = useState(cycleFilters[0]);

  const receitas = transactions.filter((t) => t.kind === "receita");
  const despesas = transactions.filter((t) => t.kind === "despesa");
  const totalReceitas = receitas.reduce((s, t) => s + parseValue(t.valor), 0);
  const totalDespesas = despesas.reduce((s, t) => s + parseValue(t.valor), 0);
  const resultado = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? ((resultado / totalReceitas) * 100).toFixed(1) : "0";

  const pendentes = receitas
    .filter((t) => t.status === "pendente")
    .reduce((s, t) => s + parseValue(t.valor), 0);

  const kpis = [
    { label: "Clientes totais", value: String(clients.length), note: "Base inteira, não apenas o mês", accent: "gold" },
    { label: "Recebimentos do ciclo", value: currency.format(totalReceitas), note: "Entradas registradas", accent: "green" },
    { label: "Custos do ciclo", value: currency.format(totalDespesas), note: "Saídas operacionais no período", accent: "red" },
    { label: "Faturamento líquido", value: currency.format(resultado), note: "Recebimentos menos custos", accent: "gold" },
    { label: "Margem líquida", value: `${margem}%`, note: "Resultado sobre recebimentos", accent: "green" },
    { label: "Contas a receber", value: currency.format(pendentes), note: "Receitas com status pendente", accent: "gold" },
  ];

  const monthLabels = ["07", "12", "17", "22", "27", "02", "07"];
  const monthlyFlow = monthLabels.map((label) => ({ label, receita: 0, despesa: 0 }));

  const annualFlow = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((label, idx) => {
    const month = idx + 1;
    const r = receitas.filter((t) => new Date(t.data).getMonth() + 1 === month).reduce((s, t) => s + parseValue(t.valor), 0);
    const d = despesas.filter((t) => new Date(t.data).getMonth() + 1 === month).reduce((s, t) => s + parseValue(t.valor), 0);
    return { label, receita: r, despesa: d };
  });

  const catTotals: Record<string, number> = {};
  despesas.forEach((t) => {
    const cat = t.categoria || "Outros";
    catTotals[cat] = (catTotals[cat] || 0) + parseValue(t.valor);
  });
  const expenseMix = [
    { label: "Equipe", value: catTotals["Equipe"] || 0, tone: "gold" },
    { label: "Ferramentas", value: catTotals["Ferramentas"] || 0, tone: "green" },
    { label: "Marketing", value: catTotals["Marketing"] || 0, tone: "red" },
    { label: "Operação", value: catTotals["Operação"] || 0, tone: "neutral" },
  ];

  const nextActions = [
    "Registrar primeira receita ou despesa",
    "Cadastrar primeiro cliente",
    "Criar proposta com IA",
  ];

  const timeline = [
    { title: "Workspace criado", text: "A base está pronta para receber dados reais.", status: "complete" },
    { title: "Dados financeiros", text: "Importe OFX, CSV ou conecte Open Finance.", status: transactions.length > 0 ? "complete" : "next" },
    { title: "Inteligência diária", text: "Insights aparecem quando houver histórico suficiente.", status: transactions.length > 5 ? "next" : "idle" },
  ];

  return (
    <div className="page dashboard-page">
      <section className="dashboard-toolbar">
        <div>
          <span className="eyebrow">Ciclo financeiro 07 → 07</span>
          <h2>Dashboard</h2>
          <p>KPIs mensais essenciais, clientes totais e saúde financeira da empresa.</p>
        </div>
        <div className="range-control" aria-label="Período">
          {cycleFilters.map((item) => (
            <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="kpi-grid financial-kpis">
        {kpis.map((item) => (
          <Card className={`kpi-card ${item.accent}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      <section className="content-grid">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h3>Receita x despesa do ciclo</h3>
              <p>Do dia 7 ao dia 7 do mês seguinte.</p>
            </div>
            <button className="ghost-button" onClick={() => onToast("Filtros preparados.")}>
              <Filter size={16} />
              Filtrar
            </button>
          </div>
          <FinancialBarChart data={monthlyFlow} />
        </Card>

        <Card className="timeline-card">
          <div className="card-heading">
            <div>
              <h3>Resumo financeiro</h3>
              <p>Indicadores que normalmente pedem atenção.</p>
            </div>
          </div>
          <div className="finance-list">
            {[
              ["Ponto de equilíbrio", totalDespesas > 0 ? currency.format(totalDespesas) : "R$ 0"],
              ["Inadimplência", totalReceitas > 0 ? `${((pendentes / totalReceitas) * 100).toFixed(1)}%` : "0%"],
              ["Ticket médio", clients.length > 0 ? currency.format(totalReceitas / clients.length) : "R$ 0"],
              ["Burn mensal", currency.format(totalDespesas)],
              ["Runway estimado", totalDespesas > 0 && resultado > 0 ? `${Math.floor(resultado / totalDespesas)} meses` : "0 meses"],
            ].map(([label, value]) => (
              <div className="finance-list-row" key={label}>
                <div>
                  <strong>{label}</strong>
                  <p>{transactions.length === 0 ? "Aguardando dados financeiros" : "Calculado em tempo real"}</p>
                </div>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="content-grid secondary-dashboard-grid">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h3>Receita x despesa anual</h3>
              <p>Comparativo mês a mês para visão de tendência.</p>
            </div>
          </div>
          <FinancialBarChart data={annualFlow} compact />
        </Card>
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h3>Tipos de despesa</h3>
              <p>Distribuição dos custos do ciclo atual.</p>
            </div>
          </div>
          <ExpenseMixChart data={expenseMix} />
        </Card>
      </section>

      <section className="soft-grid finance-priority-grid">
        <InsightCard icon={<CalendarDays size={20} />} title="Contas do ciclo" text="Recebíveis, pagamentos e vencimentos sempre organizados no período 07→07." />
        <InsightCard icon={<Activity size={20} />} title="Fluxo de caixa" text="Acompanhe saldo projetado, custo mensal, margem e necessidade de capital." />
        <InsightCard icon={<Bot size={20} />} title="Alertas da IA" text="Quando houver dados, a IA destaca variações, riscos e oportunidades financeiras." />
      </section>
    </div>
  );
}

// ── Finance ───────────────────────────────────────────────────────────────────

function FinancePage({
  transactions,
  clients,
  onToast,
  onDeleteTransaction,
}: {
  transactions: Transaction[];
  clients: Client[];
  onToast: (msg: string) => void;
  onDeleteTransaction: (id: string) => void;
}) {
  const [transactionKind, setTransactionKind] = useState<TransactionKind | null>(null);
  const [transactionChooserOpen, setTransactionChooserOpen] = useState(false);

  const openTransaction = (kind?: TransactionKind) => {
    if (kind) { setTransactionKind(kind); setTransactionChooserOpen(false); return; }
    setTransactionChooserOpen(true);
  };

  const receitas = transactions.filter((t) => t.kind === "receita");
  const despesas = transactions.filter((t) => t.kind === "despesa");
  const totalReceitas = receitas.reduce((s, t) => s + parseValue(t.valor), 0);
  const totalDespesas = despesas.reduce((s, t) => s + parseValue(t.valor), 0);

  return (
    <div className="page finance-page">
      <ModuleHeader
        eyebrow="Financeiro"
        title="Registre receitas e despesas com clareza."
        subtitle="Cada lançamento entra com contexto suficiente para alimentar caixa, margem, cliente e relatórios."
        action="Registrar transação"
        onAction={() => openTransaction()}
      />
      <section className="finance-grid">
        {[
          ["Receitas registradas", currency.format(totalReceitas), `${receitas.length} lançamento(s)`],
          ["Despesas registradas", currency.format(totalDespesas), `${despesas.length} lançamento(s)`],
          ["Resultado do ciclo", currency.format(totalReceitas - totalDespesas), "Receitas menos despesas"],
        ].map(([label, value, note]) => (
          <Card className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{note}</p>
          </Card>
        ))}
      </section>

      {transactions.length === 0 ? (
        <Card className="empty-composer">
          <CreditCard size={26} />
          <h3>Nenhum lançamento registrado ainda.</h3>
          <p>Registre uma receita ou despesa para começar a montar caixa, margem, categorias e visão mensal 07→07.</p>
          <button className="primary-button" onClick={() => openTransaction()}>
            <Plus size={18} />
            Registrar transação
          </button>
        </Card>
      ) : (
        <Card className="chart-card">
          <div className="card-heading">
            <div><h3>Lançamentos</h3><p>Histórico completo de receitas e despesas.</p></div>
            <button className="primary-button" onClick={() => openTransaction()}>
              <Plus size={16} /> Novo
            </button>
          </div>
          <div className="transaction-list">
            {transactions.map((t) => (
              <div key={t.id} className="transaction-row">
                <div className={`transaction-badge ${t.kind}`}>
                  {t.kind === "receita" ? <CircleDollarSign size={16} /> : <CreditCard size={16} />}
                </div>
                <div className="transaction-info">
                  <strong>{t.kind === "receita" ? (t.clienteNome || "—") : (t.fornecedor || "—")}</strong>
                  <span>{t.servico || t.categoria || "—"} · {t.data}</span>
                </div>
                <div className={`transaction-value ${t.kind}`}>
                  {t.kind === "receita" ? "+" : "-"}{currency.format(parseValue(t.valor))}
                </div>
                <span className={`status-badge ${t.status}`}>{t.status}</span>
                <button className="icon-button danger" onClick={() => onDeleteTransaction(t.id)} aria-label="Remover">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {transactionChooserOpen && (
        <TransactionTypeModal onClose={() => setTransactionChooserOpen(false)} onSelect={openTransaction} />
      )}
      {transactionKind && (
        <TransactionFormModal
          kind={transactionKind}
          clients={clients}
          onBack={() => { setTransactionKind(null); setTransactionChooserOpen(true); }}
          onClose={() => setTransactionKind(null)}
          onSave={async (data) => {
            await addTransaction({ ...data, kind: transactionKind });
            setTransactionKind(null);
            onToast(`${transactionKind === "receita" ? "Receita" : "Despesa"} registrada.`);
          }}
        />
      )}
    </div>
  );
}

function TransactionTypeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (kind: TransactionKind) => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="transaction-modal small" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Nova transação</span>
            <strong>O que você quer registrar?</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className="transaction-choice-grid">
          <button className="transaction-choice revenue" onClick={() => onSelect("receita")}>
            <span><CircleDollarSign size={24} /></span>
            <strong>Receita</strong>
            <p>Venda, mensalidade, contrato, entrada de caixa ou recebível.</p>
          </button>
          <button className="transaction-choice expense" onClick={() => onSelect("despesa")}>
            <span><CreditCard size={24} /></span>
            <strong>Despesa</strong>
            <p>Custo fixo, fornecedor, ferramenta, equipe ou gasto operacional.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

type TransactionFormData = Omit<Transaction, "id" | "createdAt" | "kind">;

function TransactionFormModal({
  kind,
  clients,
  onBack,
  onClose,
  onSave,
}: {
  kind: TransactionKind;
  clients: Client[];
  onBack: () => void;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
}) {
  const isRevenue = kind === "receita";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TransactionFormData>({
    valor: "",
    clienteId: "",
    clienteNome: "",
    fornecedor: "",
    servico: "",
    categoria: "",
    data: new Date().toISOString().slice(0, 10),
    status: isRevenue ? "pendente" : "aberta",
    pagamento: "",
    centroCusto: "",
    recorrencia: "nao",
    observacoes: "",
  });

  const set = (field: keyof TransactionFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (field === "clienteId") {
        const client = clients.find((c) => c.id === e.target.value);
        setForm((prev) => ({ ...prev, clienteId: e.target.value, clienteNome: client?.nome || "" }));
      } else {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      }
    };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="transaction-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">{isRevenue ? "Entrada de caixa" : "Saída de caixa"}</span>
            <strong>{isRevenue ? "Registrar receita" : "Registrar despesa"}</strong>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className="transaction-intro">
          <h3>{isRevenue ? "Registrar receita" : "Registrar despesa"}</h3>
          <p>{isRevenue ? "Informe o cliente, valor e condição do recebimento." : "Informe o fornecedor, categoria, valor e vencimento do custo."}</p>
        </div>
        <div className="transaction-form-grid">
          <label>
            <span>Valor</span>
            <input required inputMode="decimal" placeholder="R$ 0,00" value={form.valor} onChange={set("valor")} />
          </label>
          {isRevenue ? (
            <label>
              <span>Cliente</span>
              <select required value={form.clienteId} onChange={set("clienteId")}>
                <option value="" disabled>{clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione um cliente"}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
          ) : (
            <label>
              <span>Fornecedor</span>
              <input required placeholder="Ex: Google, Meta, contador..." value={form.fornecedor} onChange={set("fornecedor")} />
            </label>
          )}
          <label>
            <span>{isRevenue ? "Serviço ou contrato" : "Categoria"}</span>
            {isRevenue ? (
              <input placeholder="Ex: Gestão mensal, projeto, consultoria..." value={form.servico} onChange={set("servico")} />
            ) : (
              <select value={form.categoria} onChange={set("categoria")}>
                <option value="" disabled>Selecione uma categoria</option>
                <option>Equipe</option><option>Ferramentas</option><option>Marketing</option>
                <option>Operação</option><option>Impostos</option><option>Outros</option>
              </select>
            )}
          </label>
          <label>
            <span>{isRevenue ? "Data de recebimento" : "Data de vencimento"}</span>
            <input required type="date" value={form.data} onChange={set("data")} />
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={set("status")}>
              {isRevenue ? (
                <><option value="recebida">Recebida</option><option value="pendente">Pendente</option><option value="atrasada">Atrasada</option></>
              ) : (
                <><option value="paga">Paga</option><option value="aberta">Em aberto</option><option value="atrasada">Atrasada</option></>
              )}
            </select>
          </label>
          <label>
            <span>Forma de pagamento</span>
            <select value={form.pagamento} onChange={set("pagamento")}>
              <option value="" disabled>Selecione</option>
              <option>Pix</option><option>Boleto</option><option>Cartão</option><option>Transferência</option><option>Dinheiro</option>
            </select>
          </label>
          {!isRevenue && (
            <label>
              <span>Centro de custo</span>
              <select value={form.centroCusto} onChange={set("centroCusto")}>
                <option value="" disabled>Selecione</option>
                <option>Administrativo</option><option>Comercial</option><option>Operação</option><option>Produto</option>
              </select>
            </label>
          )}
          <label>
            <span>{isRevenue ? "Recorrência" : "Repetir despesa"}</span>
            <select value={form.recorrencia} onChange={set("recorrencia")}>
              <option value="nao">Não recorrente</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label className="wide">
            <span>Observações</span>
            <textarea rows={4} placeholder="Contexto, nota fiscal, condição comercial..." value={form.observacoes} onChange={set("observacoes")} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onBack}>Voltar</button>
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando..." : `Salvar ${isRevenue ? "receita" : "despesa"}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Proposals ─────────────────────────────────────────────────────────────────

function ProposalsPage({
  proposals,
  onCreate,
  onToast,
  onDeleteProposal,
  onUpdateStatus,
}: {
  proposals: Proposal[];
  onCreate: () => void;
  onToast: (msg: string) => void;
  onDeleteProposal: (id: string) => void;
  onUpdateStatus: (id: string, status: Proposal["status"]) => void;
}) {
  const rascunhos = proposals.filter((p) => p.status === "rascunho").length;
  const enviadas = proposals.filter((p) => p.status === "enviada").length;
  const aprovadas = proposals.filter((p) => p.status === "aprovada").length;

  return (
    <div className="page proposals-page">
      <ModuleHeader
        eyebrow="Propostas"
        title="Criação comercial com aparência premium."
        subtitle="Um fluxo guiado para transformar contexto em propostas claras e elegantes."
        action="Criar com IA"
        onAction={onCreate}
      />
      <section className="proposal-grid">
        {[
          ["Rascunhos", String(rascunhos), rascunhos === 0 ? "Nada pendente" : `${rascunhos} proposta(s)`],
          ["Enviadas", String(enviadas), enviadas === 0 ? "Sem envios" : `${enviadas} proposta(s)`],
          ["Aprovadas", String(aprovadas), aprovadas === 0 ? "Sem aprovações" : `${aprovadas} proposta(s)`],
        ].map(([label, value, note]) => (
          <Card className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{note}</p>
          </Card>
        ))}
      </section>

      {proposals.length === 0 ? (
        <Card className="empty-composer">
          <BriefcaseBusiness size={28} />
          <h3>Comece com uma proposta de teste.</h3>
          <p>A IA pode estruturar escopo, cronograma, investimento e versões para decisores.</p>
          <div className="button-row">
            <button className="primary-button" onClick={onCreate}>
              <WandSparkles size={18} /> Criar proposta
            </button>
            <button className="secondary-button" onClick={() => onToast("Templates preparados.")}>
              <FileText size={18} /> Ver templates
            </button>
          </div>
        </Card>
      ) : (
        <Card className="chart-card">
          <div className="card-heading">
            <div><h3>Propostas</h3><p>Histórico do pipeline comercial.</p></div>
            <button className="primary-button" onClick={onCreate}><Plus size={16} /> Nova</button>
          </div>
          <div className="transaction-list">
            {proposals.map((p) => (
              <div key={p.id} className="transaction-row">
                <div className="transaction-badge receita"><BriefcaseBusiness size={16} /></div>
                <div className="transaction-info">
                  <strong>{p.clienteNome || "—"}</strong>
                  <span>{p.servicoPrincipal || "—"}</span>
                </div>
                <div className="transaction-value receita">{p.valorTotal ? currency.format(parseValue(p.valorTotal)) : "—"}</div>
                <select
                  className={`status-badge ${p.status}`}
                  value={p.status}
                  onChange={(e) => onUpdateStatus(p.id, e.target.value as Proposal["status"])}
                >
                  <option value="rascunho">rascunho</option>
                  <option value="enviada">enviada</option>
                  <option value="aprovada">aprovada</option>
                </select>
                <button className="icon-button danger" onClick={() => onDeleteProposal(p.id)} aria-label="Remover">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Clients ───────────────────────────────────────────────────────────────────

function ClientesPage({
  clients,
  onNewClient,
  onDeleteClient,
}: {
  clients: Client[];
  onNewClient: () => void;
  onDeleteClient: (id: string) => void;
}) {
  return (
    <div className="page">
      <ModuleHeader
        eyebrow="Clientes"
        title="Carteira de clientes com clareza operacional."
        subtitle="Organize contatos, CNPJ e contexto comercial de cada relacionamento."
        action="Novo cliente"
        onAction={onNewClient}
      />
      {clients.length === 0 ? (
        <Card className="empty-composer large">
          <Users size={24} />
          <h3>Nenhum cliente cadastrado ainda.</h3>
          <p>Cadastre o primeiro cliente para começar a vincular receitas, propostas e histórico.</p>
          <button className="primary-button" onClick={onNewClient}>
            <Plus size={18} /> Cadastrar cliente
          </button>
        </Card>
      ) : (
        <section className="client-list">
          {clients.map((client) => (
            <Card key={client.id} className="client-card">
              <div className="client-card-head">
                <div className="client-avatar">{client.nome.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{client.nome}</strong>
                  <span>{client.cnpj || "CNPJ não informado"}</span>
                </div>
                <button className="icon-button danger" style={{ marginLeft: "auto" }} onClick={() => onDeleteClient(client.id)} aria-label="Remover">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="client-card-body">
                {client.email && <p><span>E-mail</span>{client.email}</p>}
                {client.telefone && <p><span>Telefone</span>{client.telefone}</p>}
                {client.responsavel && <p><span>Responsável</span>{client.responsavel}</p>}
                {client.segmento && <p><span>Segmento</span>{client.segmento}</p>}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function ClientFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Client, "id" | "createdAt">) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", cnpj: "", email: "", telefone: "",
    responsavel: "", segmento: "", site: "", observacoes: "",
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="transaction-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Cadastro</span>
            <strong>Novo cliente</strong>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className="transaction-intro">
          <h3>Cadastrar cliente</h3>
          <p>Preencha os dados do cliente para vinculá-lo a receitas, propostas e histórico.</p>
        </div>
        <div className="transaction-form-grid">
          <label><span>Nome / Razão social *</span><input required placeholder="Ex: Acme Ltda." value={form.nome} onChange={set("nome")} /></label>
          <label><span>CNPJ</span><input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={set("cnpj")} /></label>
          <label><span>E-mail</span><input type="email" placeholder="contato@empresa.com" value={form.email} onChange={set("email")} /></label>
          <label><span>Telefone</span><input placeholder="(11) 99999-0000" value={form.telefone} onChange={set("telefone")} /></label>
          <label><span>Responsável / Contato</span><input placeholder="Nome do ponto focal" value={form.responsavel} onChange={set("responsavel")} /></label>
          <label>
            <span>Segmento</span>
            <select value={form.segmento} onChange={set("segmento")}>
              <option value="">Selecione</option>
              <option>Agência</option><option>Consultoria</option><option>E-commerce</option>
              <option>Educação</option><option>Indústria</option><option>Saúde</option>
              <option>Tecnologia</option><option>Varejo</option><option>Outro</option>
            </select>
          </label>
          <label className="wide"><span>Site</span><input type="url" placeholder="https://empresa.com.br" value={form.site} onChange={set("site")} /></label>
          <label className="wide">
            <span>Observações</span>
            <textarea rows={4} placeholder="Contexto do relacionamento, origem, notas..." value={form.observacoes} onChange={set("observacoes")} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Proposal Modal ────────────────────────────────────────────────────────────

type ProposalFormData = Omit<Proposal, "id" | "status" | "createdAt">;

function ProposalModal({
  clients,
  onClose,
  onDone,
}: {
  clients: Client[];
  onClose: () => void;
  onDone: (data: ProposalFormData) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = ["Cliente", "Escopo", "Investimento", "Revisão"];
  const [form, setForm] = useState<ProposalFormData>({
    clienteNome: "", servicoPrincipal: "", objetivo: "",
    entregaveis: "", prazo: "", criterios: "",
    valorTotal: "", condicao: "", observacoes: "",
  });

  const set = (field: keyof ProposalFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const done = async () => {
    setSaving(true);
    await onDone(form);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="proposal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div><span className="eyebrow">Proposta IA</span><strong>Fluxo premium guiado</strong></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className="step-line">
          {steps.map((label, index) => (
            <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => setStep(index)}>
              <span>{index + 1}</span>{label}
            </button>
          ))}
        </div>
        <div className="proposal-body">
          {step === 0 && (
            <div className="form-step">
              <h3>Quem vai receber a proposta?</h3>
              <div className="form-grid">
                <label>
                  <span>Cliente</span>
                  <select value={form.clienteNome} onChange={(e) => setForm((p) => ({ ...p, clienteNome: e.target.value }))}>
                    <option value="">Selecione ou digite abaixo</option>
                    {clients.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </label>
                <label><span>Nome do cliente (manual)</span><input placeholder="Ou digite o nome..." value={form.clienteNome} onChange={set("clienteNome")} /></label>
                <label><span>Serviço principal</span><input placeholder="Ex: Gestão de tráfego, consultoria..." value={form.servicoPrincipal} onChange={set("servicoPrincipal")} /></label>
                <label className="wide"><span>Objetivo do projeto</span><textarea rows={4} value={form.objetivo} onChange={set("objetivo")} /></label>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="form-step">
              <h3>Defina o escopo com clareza.</h3>
              <div className="form-grid">
                <label><span>Entregáveis</span><input value={form.entregaveis} onChange={set("entregaveis")} /></label>
                <label><span>Prazo esperado</span><input value={form.prazo} onChange={set("prazo")} /></label>
                <label className="wide"><span>Critérios de sucesso</span><textarea rows={4} value={form.criterios} onChange={set("criterios")} /></label>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="form-step">
              <h3>Organize o investimento.</h3>
              <div className="form-grid">
                <label><span>Valor total</span><input inputMode="decimal" placeholder="R$ 0,00" value={form.valorTotal} onChange={set("valorTotal")} /></label>
                <label><span>Condição de pagamento</span><input value={form.condicao} onChange={set("condicao")} /></label>
                <label className="wide"><span>Observações comerciais</span><textarea rows={4} value={form.observacoes} onChange={set("observacoes")} /></label>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="review-state">
              <Sparkles size={30} />
              <h3>Pronto para gerar a versão executiva.</h3>
              <p>A IA vai transformar o contexto em um rascunho elegante, objetivo e fácil de revisar.</p>
              <div style={{ marginTop: "1rem", textAlign: "left", fontSize: "0.85rem", opacity: 0.7 }}>
                <p><strong>Cliente:</strong> {form.clienteNome || "—"}</p>
                <p><strong>Serviço:</strong> {form.servicoPrincipal || "—"}</p>
                <p><strong>Valor:</strong> {form.valorTotal ? currency.format(parseValue(form.valorTotal)) : "—"}</p>
              </div>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button
            className="primary-button"
            disabled={saving}
            onClick={() => step === steps.length - 1 ? done() : setStep(step + 1)}
          >
            {step === steps.length - 1 ? (saving ? "Salvando..." : "Gerar rascunho") : "Continuar"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsPage({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div className="page">
      <ModuleHeader
        eyebrow="Ajustes"
        title="Preferências do workspace."
        subtitle="Configure aparência, moeda e automações com controles simples."
        action="Salvar ajustes"
        onAction={() => onToast("Ajustes salvos.")}
      />
      <section className="settings-grid">
        {["Graphite dark", "BRL", "Sidebar confortável", "IA assistiva"].map((item) => (
          <Card className="setting-card" key={item}>
            <span>{item}</span>
            <button><CheckCircle2 size={16} />Ativo</button>
          </Card>
        ))}
      </section>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function EmptyModule({ icon, title, subtitle, action, onAction }: {
  icon: ReactNode; title: string; subtitle: string; action: string; onAction: () => void;
}) {
  return (
    <div className="page">
      <ModuleHeader eyebrow={title} title={`${title} com clareza operacional.`} subtitle={subtitle} action={action} onAction={onAction} />
      <Card className="empty-composer large">
        {icon}
        <h3>Este módulo está pronto para receber dados.</h3>
        <p>O layout permanece limpo enquanto o workspace ainda está em ativação.</p>
        <button className="primary-button" onClick={onAction}><Plus size={18} />{action}</button>
      </Card>
    </div>
  );
}

function ModuleHeader({ eyebrow, title, subtitle, action, onAction }: {
  eyebrow: string; title: string; subtitle: string; action: string; onAction: () => void;
}) {
  return (
    <section className="module-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <button className="primary-button" onClick={onAction}><Plus size={18} />{action}</button>
    </section>
  );
}

function FinancialBarChart({ data, compact = false }: {
  data: Array<{ label: string; receita: number; despesa: number }>; compact?: boolean;
}) {
  const max = Math.max(1, ...data.flatMap((item) => [item.receita, item.despesa]));
  const hasData = data.some((item) => item.receita > 0 || item.despesa > 0);
  return (
    <div className={compact ? "chart-wrap compact" : "chart-wrap"}>
      <div className="chart-legend">
        <span><i className="legend-dot revenue" /> Receita</span>
        <span><i className="legend-dot expense" /> Despesa</span>
      </div>
      <div className={hasData ? "paired-chart" : "paired-chart empty"}>
        {data.map((item) => (
          <div className="paired-column" key={item.label}>
            <div className="paired-bars">
              <span className="revenue-bar" style={{ height: `${hasData ? Math.max(8, (item.receita / max) * 100) : 8}%` }} />
              <span className="expense-bar" style={{ height: `${hasData ? Math.max(8, (item.despesa / max) * 100) : 8}%` }} />
            </div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
      {!hasData && <p className="chart-empty-label">Aguardando lançamentos para preencher o gráfico.</p>}
    </div>
  );
}

function ExpenseMixChart({ data }: { data: Array<{ label: string; value: number; tone: string }> }) {
  const total = data.reduce((s, item) => s + item.value, 0);
  return (
    <div className="expense-mix">
      <div className={total > 0 ? "mix-ring" : "mix-ring empty"}>
        <span>{total > 0 ? `${((data[0].value / total) * 100).toFixed(0)}%` : "0%"}</span>
      </div>
      <div className="mix-list">
        {data.map((item) => (
          <div className="mix-row" key={item.label}>
            <span><i className={`legend-dot ${item.tone}`} />{item.label}</span>
            <strong>{total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="insight-card">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </Card>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function CopilotPanel({ onClose, onAsk }: { onClose: () => void; onAsk: (msg: string) => void }) {
  const nextActions = ["Registrar primeira receita ou despesa", "Cadastrar primeiro cliente", "Criar proposta com IA"];
  return (
    <aside className="copilot-panel">
      <div className="panel-head">
        <div><span className="eyebrow">Copilot</span><strong>Orientação executiva</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
      </div>
      <div className="copilot-body">
        <Card className="assistant-note">
          <Sparkles size={20} />
          <p>O workspace está em ativação. Posso ajudar você a começar pelo caminho mais rápido.</p>
        </Card>
        {nextActions.map((action) => (
          <button className="copilot-action" key={action} onClick={() => { onAsk(action); onClose(); }}>
            {action}<ArrowRight size={16} />
          </button>
        ))}
      </div>
    </aside>
  );
}

function CommandPalette({ onClose, onNavigate, onCreateProposal, onOpenCopilot }: {
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onCreateProposal: () => void;
  onOpenCopilot: () => void;
}) {
  const [query, setQuery] = useState("");
  const commands = useMemo(() => [
    ...navItems.map((item) => ({ label: `Ir para ${item.label}`, icon: item.icon, run: () => onNavigate(item.id) })),
    { label: "Criar proposta com IA", icon: <WandSparkles size={18} />, run: onCreateProposal },
    { label: "Abrir Copilot", icon: <Sparkles size={18} />, run: onOpenCopilot },
  ], [onCreateProposal, onNavigate, onOpenCopilot]);

  const filtered = commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-search">
          <Command size={18} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ação..." />
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="command-list">
          {filtered.map((item) => (
            <button key={item.label} onClick={() => { item.run(); onClose(); }}>
              <span>{item.icon}</span>{item.label}<ArrowRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}><Sparkles size={16} />{toast.message}</div>
      ))}
    </div>
  );
}

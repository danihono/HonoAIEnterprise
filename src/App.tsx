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
  Download,
  FileText,
  Filter,
  FolderOpen,
  ImageIcon,
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
import {
  DocumentSection,
  ProposalForm,
  ReportContent,
  ReportOptions,
  SheetKey,
  generateDocumentSections,
  generateReportContent,
  generateSectionContent,
  refineDocumentSections,
} from "./lib/claude";
import { exportToExcel } from "./lib/excel";
import { DocStyle, extractStyleFromFile, extractTextFromFile } from "./lib/extract";
import { exportToDocx, printProposal } from "./lib/document";

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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [proposalEditorData, setProposalEditorData] = useState<{
    id?: string;
    form: ProposalFormData;
    sections: DocumentSection[];
    docStyle: DocStyle;
  } | null>(null);
  const [proposalViewerId, setProposalViewerId] = useState<string | null>(null);

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
            onView={(id) => setProposalViewerId(id)}
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
          <RelatóriosPage
            proposals={proposals}
            transactions={transactions}
            clients={clients}
            onOpenReport={() => setReportModalOpen(true)}
            onToast={showToast}
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
          onGenerated={({ form, sections, docStyle }) => {
            setProposalOpen(false);
            setProposalEditorData({ form, sections, docStyle });
          }}
        />
      )}
      {proposalEditorData && (
        <ProposalEditor
          data={proposalEditorData}
          onClose={() => setProposalEditorData(null)}
          onSave={async (sections, form, docStyle) => {
            const documentSections = JSON.stringify(sections);
            const docStyleJson = JSON.stringify(docStyle);
            if (proposalEditorData.id) {
              await updateProposal(proposalEditorData.id, { documentSections, docStyle: docStyleJson });
              showToast("Proposta atualizada.");
            } else {
              await addProposal({ ...form, status: "rascunho", documentSections, docStyle: docStyleJson });
              showToast("Proposta salva com sucesso.");
            }
            setProposalEditorData(null);
          }}
        />
      )}
      {proposalViewerId && (() => {
        const viewed = proposals.find((p) => p.id === proposalViewerId);
        if (!viewed) return null;
        const viewedSections: DocumentSection[] = viewed.documentSections
          ? JSON.parse(viewed.documentSections)
          : viewed.generatedText
          ? [{ id: "1", heading: "Proposta", content: viewed.generatedText }]
          : [];
        const viewedStyle: DocStyle = viewed.docStyle ? JSON.parse(viewed.docStyle) : {};
        return (
          <ProposalViewer
            proposal={viewed}
            sections={viewedSections}
            docStyle={viewedStyle}
            onClose={() => setProposalViewerId(null)}
            onEdit={() => {
              setProposalViewerId(null);
              setProposalEditorData({
                id: viewed.id,
                form: {
                  clienteNome: viewed.clienteNome,
                  servicoPrincipal: viewed.servicoPrincipal,
                  objetivo: viewed.objetivo,
                  entregaveis: viewed.entregaveis,
                  prazo: viewed.prazo,
                  criterios: viewed.criterios,
                  valorTotal: viewed.valorTotal,
                  condicao: viewed.condicao,
                  observacoes: viewed.observacoes,
                },
                sections: viewedSections,
                docStyle: viewedStyle,
              });
            }}
          />
        );
      })()}
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
      {reportModalOpen && (
        <ReportModal
          proposals={proposals}
          transactions={transactions}
          onClose={() => setReportModalOpen(false)}
          onToast={showToast}
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
  onView,
  onDeleteProposal,
  onUpdateStatus,
}: {
  proposals: Proposal[];
  onCreate: () => void;
  onToast: (msg: string) => void;
  onView: (id: string) => void;
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
                <button className="secondary-button view-btn" onClick={() => onView(p.id)}>
                  <FileText size={14} /> Ver
                </button>
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

type ProposalFormData = Omit<Proposal, "id" | "status" | "createdAt" | "generatedText" | "documentSections" | "docStyle">;

const DEFAULT_DOC_STYLE: DocStyle = {
  fontBody: "Georgia",
  fontHeading: "Arial",
  accentColor: "#111111",
  textColor: "#111111",
  bgColor: "#ffffff",
};

const FONT_OPTIONS = ["Georgia", "Times New Roman", "Arial", "Helvetica", "Inter", "Montserrat", "Lato", "Garamond"];

function ProposalModal({
  clients,
  onClose,
  onGenerated,
}: {
  clients: Client[];
  onClose: () => void;
  onGenerated: (data: { form: ProposalFormData; sections: DocumentSection[]; docStyle: DocStyle }) => void;
}) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("");
  const [templateFileName, setTemplateFileName] = useState("");
  const [detectedStyle, setDetectedStyle] = useState<DocStyle>({});
  const steps = ["Cliente & Modelo", "Escopo", "Investimento", "Gerar"];
  const [form, setForm] = useState<ProposalFormData>({
    clienteNome: "", servicoPrincipal: "", objetivo: "",
    entregaveis: "", prazo: "", criterios: "",
    valorTotal: "", condicao: "", observacoes: "",
  });

  const set = (field: keyof ProposalFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setTemplateFileName(file.name);
    try {
      const [text, style] = await Promise.all([
        extractTextFromFile(file),
        extractStyleFromFile(file),
      ]);
      setTemplate(text);
      setDetectedStyle(style);
    } catch {
      setError("Não foi possível ler o arquivo. Tente colar o texto manualmente.");
    } finally {
      setExtracting(false);
    }
  };

  const generate = async () => {
    setError("");
    setGenerating(true);
    try {
      const sections = await generateDocumentSections(form as ProposalForm, template || undefined);
      const docStyle = { ...DEFAULT_DOC_STYLE, ...detectedStyle };
      onGenerated({ form, sections, docStyle });
    } catch {
      setError("Erro ao gerar proposta. Verifique a chave da API no arquivo .env e tente novamente.");
    } finally {
      setGenerating(false);
    }
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
              <h3>Quem vai receber e qual o modelo?</h3>
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
                <label className="wide"><span>Objetivo do projeto</span><textarea rows={3} value={form.objetivo} onChange={set("objetivo")} /></label>
                <label className="wide template-upload-label">
                  <span>Upload do modelo (.pdf ou .docx) <em style={{ opacity: 0.5, fontWeight: 400 }}>— o Claude copia a estrutura</em></span>
                  <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} className="file-input" disabled={extracting} />
                  {extracting && <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>Extraindo texto do arquivo...</span>}
                  {templateFileName && !extracting && <span style={{ fontSize: "0.8rem", color: "#4ade80" }}>✓ {templateFileName} carregado</span>}
                </label>
                <label className="wide">
                  <span>Ou cole o modelo aqui <em style={{ opacity: 0.5, fontWeight: 400 }}>(opcional)</em></span>
                  <textarea
                    rows={4}
                    placeholder="Cole aqui uma proposta anterior para o Claude copiar o estilo..."
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  />
                </label>
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
              <h3>Tudo pronto para gerar.</h3>
              <p>O Claude vai criar a proposta em seções editáveis, com preview e export para Word e PDF.</p>
              <div style={{ marginTop: "1rem", textAlign: "left", fontSize: "0.85rem", opacity: 0.7 }}>
                <p><strong>Cliente:</strong> {form.clienteNome || "—"}</p>
                <p><strong>Serviço:</strong> {form.servicoPrincipal || "—"}</p>
                <p><strong>Valor:</strong> {form.valorTotal ? currency.format(parseValue(form.valorTotal)) : "—"}</p>
                {template && <p><strong>Modelo:</strong> ✓ {templateFileName || "colado manualmente"}</p>}
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button
            className="primary-button"
            disabled={generating || extracting}
            onClick={() => step === steps.length - 1 ? generate() : setStep(step + 1)}
          >
            {step === steps.length - 1
              ? (generating ? <><Sparkles size={16} className="spin" /> Gerando seções...</> : <><WandSparkles size={16} /> Gerar proposta</>)
              : <><ArrowRight size={18} /> Continuar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document canvas helper ────────────────────────────────────────────────────

function DocumentCanvas({
  sections,
  meta,
  logo,
  docStyle,
}: {
  sections: DocumentSection[];
  meta: { clienteNome: string; servicoPrincipal: string; valorTotal: string };
  logo?: string;
  docStyle?: DocStyle;
}) {
  const ds = docStyle ?? {};
  return (
    <div
      className="document-canvas"
      style={{
        fontFamily: ds.fontBody ? `"${ds.fontBody}", Georgia, serif` : undefined,
        color: ds.textColor ?? undefined,
        backgroundColor: ds.bgColor ?? undefined,
        "--doc-accent": ds.accentColor ?? "#111111",
      } as React.CSSProperties}
    >
      {logo && <img src={logo} alt="Logo" className="doc-logo" />}
      <div className="doc-title">PROPOSTA COMERCIAL</div>
      <div className="doc-meta-bar">
        {[["Para", meta.clienteNome], ["Serviço", meta.servicoPrincipal], ["Valor", meta.valorTotal], ["Data", new Date().toLocaleDateString("pt-BR")]].map(
          ([label, val]) => (
            <div key={label} className="doc-meta-item">
              <span className="doc-meta-label">{label}</span>
              <span>{val || "—"}</span>
            </div>
          )
        )}
      </div>
      <hr className="doc-divider" />
      {sections.map((s) => (
        <div key={s.id} className="doc-section">
          <h2 className="doc-section-heading">{s.heading}</h2>
          <div className="doc-section-content">
            {s.content.split("\n").map((line, i) =>
              line.trim() ? <p key={i}>{line}</p> : <br key={i} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Proposal Editor ───────────────────────────────────────────────────────────

function ProposalEditor({
  data,
  onClose,
  onSave,
}: {
  data: { id?: string; form: ProposalFormData; sections: DocumentSection[]; docStyle: DocStyle };
  onClose: () => void;
  onSave: (sections: DocumentSection[], form: ProposalFormData, docStyle: DocStyle) => Promise<void>;
}) {
  const [sections, setSections] = useState<DocumentSection[]>(data.sections);
  const [docStyle, setDocStyle] = useState<DocStyle>(data.docStyle ?? DEFAULT_DOC_STYLE);
  const [logo, setLogo] = useState<string | undefined>(() => localStorage.getItem("workspace_logo") ?? undefined);
  const [saving, setSaving] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogo(base64);
      localStorage.setItem("workspace_logo", base64);
    };
    reader.readAsDataURL(file);
  };

  const updateSection = (id: string, field: "heading" | "content", value: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const generateSection = async (section: DocumentSection) => {
    setGeneratingSection(section.id);
    try {
      const content = await generateSectionContent(section.heading, data.form as ProposalForm);
      updateSection(section.id, "content", content);
    } finally {
      setGeneratingSection(null);
    }
  };

  const addSection = () =>
    setSections((prev) => [...prev, { id: Date.now().toString(), heading: "Nova seção", content: "" }]);

  const removeSection = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id));

  const handleRefine = async () => {
    if (!refineInput.trim()) return;
    setRefining(true);
    try {
      const updated = await refineDocumentSections(sections, refineInput);
      setSections(updated);
      setRefineInput("");
    } finally {
      setRefining(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      await exportToDocx(sections, data.form, logo, docStyle);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => printProposal(sections, data.form, logo, docStyle);

  return (
    <div className="modal-backdrop editor-backdrop">
      <div className="proposal-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="editor-topbar">
          <div className="editor-logo-area">
            <label className="logo-upload-btn" title="Clique para trocar o logo">
              {logo
                ? <img src={logo} alt="Logo" className="editor-logo-img" />
                : <span className="logo-placeholder"><ImageIcon size={16} /> Logo</span>}
              <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
            </label>
            <div>
              <span className="eyebrow">Editor</span>
              <strong>{data.form.clienteNome || "Nova proposta"} — {data.form.servicoPrincipal}</strong>
            </div>
          </div>
          <div className="editor-actions">
            <button className="secondary-button" onClick={handleExportPdf} title="Imprimir / Salvar como PDF">
              <FileText size={14} /> PDF
            </button>
            <button className="secondary-button" onClick={handleExportDocx} disabled={exporting} title="Baixar Word (.docx)">
              <Download size={14} /> {exporting ? "..." : "Word"}
            </button>
            <button className="secondary-button" onClick={onClose}>Descartar</button>
            <button className="primary-button" disabled={saving} onClick={async () => {
              setSaving(true);
              await onSave(sections, data.form, docStyle);
              setSaving(false);
            }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="editor-split">
          <div className="sections-panel">
            <div className="pane-label">Tema visual</div>
            <div className="theme-panel">
              <label className="theme-row">
                <span>Fonte corpo</span>
                <select value={docStyle.fontBody ?? ""} onChange={(e) => setDocStyle((p) => ({ ...p, fontBody: e.target.value }))}>
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="theme-row">
                <span>Fonte heading</span>
                <select value={docStyle.fontHeading ?? ""} onChange={(e) => setDocStyle((p) => ({ ...p, fontHeading: e.target.value }))}>
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="theme-row">
                <span>Cor destaque</span>
                <input type="color" value={docStyle.accentColor ?? "#111111"} onChange={(e) => setDocStyle((p) => ({ ...p, accentColor: e.target.value }))} />
              </label>
              <label className="theme-row">
                <span>Cor texto</span>
                <input type="color" value={docStyle.textColor ?? "#111111"} onChange={(e) => setDocStyle((p) => ({ ...p, textColor: e.target.value }))} />
              </label>
              <label className="theme-row">
                <span>Cor fundo</span>
                <input type="color" value={docStyle.bgColor ?? "#ffffff"} onChange={(e) => setDocStyle((p) => ({ ...p, bgColor: e.target.value }))} />
              </label>
            </div>
            <div className="pane-label" style={{ marginTop: "1rem" }}>Seções</div>
            <div className="sections-list">
              {sections.map((section) => (
                <div key={section.id} className="section-block">
                  <div className="section-block-head">
                    <input
                      className="section-heading-input"
                      value={section.heading}
                      onChange={(e) => updateSection(section.id, "heading", e.target.value)}
                      placeholder="Título da seção"
                    />
                    <button
                      className="icon-button"
                      onClick={() => generateSection(section)}
                      disabled={!!generatingSection}
                      title="Gerar com IA"
                    >
                      {generatingSection === section.id
                        ? <Sparkles size={13} className="spin" />
                        : <WandSparkles size={13} />}
                    </button>
                    <button className="icon-button danger" onClick={() => removeSection(section.id)} title="Remover seção">
                      <X size={13} />
                    </button>
                  </div>
                  <textarea
                    className="section-textarea"
                    rows={6}
                    value={section.content}
                    onChange={(e) => updateSection(section.id, "content", e.target.value)}
                    placeholder="Conteúdo desta seção..."
                  />
                </div>
              ))}
              <button className="secondary-button add-section-btn" onClick={addSection}>
                <Plus size={13} /> Adicionar seção
              </button>
            </div>
          </div>

          <div className="document-canvas-wrap">
            <div className="pane-label">Preview do documento</div>
            <div className="document-canvas-scroll">
              <DocumentCanvas sections={sections} meta={data.form} logo={logo} docStyle={docStyle} />
            </div>
          </div>
        </div>

        <div className="refine-bar">
          <Sparkles size={16} className="refine-icon" />
          <input
            className="refine-input"
            placeholder='Ajuste com IA... ex: "deixa mais formal", "adicione seção de garantias", "encurta a apresentação"'
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRefine()}
            disabled={refining}
          />
          <button className="primary-button refine-btn" onClick={handleRefine} disabled={refining || !refineInput.trim()}>
            {refining ? <><Sparkles size={14} className="spin" /> Ajustando...</> : "Ajustar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Proposal Viewer ────────────────────────────────────────────────────────────

function ProposalViewer({
  proposal,
  sections,
  docStyle,
  onClose,
  onEdit,
}: {
  proposal: Proposal;
  sections: DocumentSection[];
  docStyle: DocStyle;
  onClose: () => void;
  onEdit: () => void;
}) {
  const logo = localStorage.getItem("workspace_logo") ?? undefined;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="proposal-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Proposta</span>
            <strong>{proposal.clienteNome} — {proposal.servicoPrincipal}</strong>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button className="secondary-button" onClick={() => printProposal(sections, proposal, logo, docStyle)}>
              <FileText size={14} /> PDF
            </button>
            <button className="secondary-button" onClick={() => exportToDocx(sections, proposal, logo, docStyle)}>
              <Download size={14} /> Word
            </button>
            <button className="secondary-button" onClick={onEdit}><WandSparkles size={14} /> Editar com IA</button>
            <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
          </div>
        </div>
        <div className="viewer-body">
          {sections.length > 0 ? (
            <DocumentCanvas sections={sections} meta={proposal} logo={logo} docStyle={docStyle} />
          ) : (
            <div className="viewer-summary">
              <p><strong>Objetivo:</strong> {proposal.objetivo || "—"}</p>
              <p><strong>Entregáveis:</strong> {proposal.entregaveis || "—"}</p>
              <p><strong>Valor:</strong> {proposal.valorTotal || "—"}</p>
              <p style={{ marginTop: "1.5rem", opacity: 0.6, fontSize: "0.85rem" }}>
                Clique em "Editar com IA" para gerar o documento completo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Relatórios ────────────────────────────────────────────────────────────────

function RelatóriosPage({
  proposals,
  transactions,
  clients,
  onOpenReport,
  onToast,
}: {
  proposals: Proposal[];
  transactions: Transaction[];
  clients: Client[];
  onOpenReport: () => void;
  onToast: (msg: string) => void;
}) {
  const receitas = transactions.filter((t) => t.kind === "receita").reduce((s, t) => s + parseValue(t.valor), 0);

  return (
    <div className="page proposals-page">
      <ModuleHeader
        eyebrow="Relatórios"
        title="Relatórios executivos personalizados."
        subtitle="O Claude analisa suas propostas e gera planilhas Excel com projeções, estratégia e riscos."
        action="Gerar relatório Excel"
        onAction={onOpenReport}
      />
      <section className="proposal-grid">
        {[
          ["Propostas ativas", String(proposals.length), proposals.length === 0 ? "Nenhuma ainda" : `${proposals.length} no pipeline`],
          ["Receita registrada", currency.format(receitas), "Entradas no workspace"],
          ["Clientes ativos", String(clients.length), clients.length === 0 ? "Nenhum ainda" : `${clients.length} cadastrados`],
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
          <BarChart3 size={26} />
          <h3>Crie uma proposta para gerar relatórios.</h3>
          <p>Os relatórios são personalizados por proposta — com projeções, milestones e análise de risco gerados pelo Claude.</p>
          <button className="primary-button" onClick={onOpenReport}>
            <Plus size={18} /> Gerar relatório geral
          </button>
        </Card>
      ) : (
        <Card className="chart-card">
          <div className="card-heading">
            <div><h3>Propostas disponíveis</h3><p>Selecione uma para gerar o relatório Excel personalizado.</p></div>
            <button className="primary-button" onClick={onOpenReport}><Plus size={16} /> Novo relatório</button>
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
                <span className={`status-badge ${p.status}`}>{p.status}</span>
                <button className="secondary-button view-btn" onClick={onOpenReport}>
                  <Download size={14} /> Gerar Excel
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="soft-grid finance-priority-grid">
        <InsightCard icon={<BarChart3 size={20} />} title="Projeção financeira" text="12 meses de receita, despesa e fluxo acumulado com base no valor e prazo da proposta." />
        <InsightCard icon={<CalendarDays size={20} />} title="Planejamento & Marcos" text="Fases do projeto com datas de início e fim, responsáveis e status gerados pela IA." />
        <InsightCard icon={<Activity size={20} />} title="Análise de risco" text="Riscos identificados pelo Claude com probabilidade, impacto e estratégia de mitigação." />
      </section>
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────────────────

const SHEET_DEFS: Array<{ key: SheetKey; label: string; desc: string; icon: React.ReactNode }> = [
  { key: "resumo",     label: "Resumo Executivo",      desc: "KPIs, cliente e indicadores financeiros dos dados reais",    icon: <BarChart3 size={15} /> },
  { key: "financeiro", label: "Projeção Financeira",   desc: "12 meses de receita, despesa e acumulado — gerado pelo Claude", icon: <CircleDollarSign size={15} /> },
  { key: "milestones", label: "Planejamento & Marcos", desc: "Fases do projeto com datas e responsáveis — gerado pelo Claude", icon: <CalendarDays size={15} /> },
  { key: "estrategia", label: "Estratégia",            desc: "Recomendações estratégicas priorizadas — gerado pelo Claude",   icon: <Sparkles size={15} /> },
  { key: "fluxo",      label: "Fluxo de Caixa",        desc: "Transações reais do cliente registradas no sistema",           icon: <Activity size={15} /> },
  { key: "riscos",     label: "Análise de Risco",       desc: "Riscos com probabilidade, impacto e mitigação — Claude",       icon: <BriefcaseBusiness size={15} /> },
];

function ReportModal({
  proposals,
  transactions,
  onClose,
  onToast,
}: {
  proposals: Proposal[];
  transactions: Transaction[];
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [selectedProposalId, setSelectedProposalId] = useState<string>("geral");
  const [selectedSheets, setSelectedSheets] = useState<SheetKey[]>(["resumo", "financeiro", "milestones", "estrategia", "fluxo", "riscos"]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const toggleSheet = (key: SheetKey) =>
    setSelectedSheets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleGenerate = async () => {
    if (selectedSheets.length === 0) { setError("Selecione ao menos uma aba."); return; }
    setError("");
    setGenerating(true);
    try {
      const proposal = selectedProposalId === "geral"
        ? null
        : proposals.find((p) => p.id === selectedProposalId) ?? null;

      const options: ReportOptions = { sheets: selectedSheets, proposalId: selectedProposalId };

      const aiSheets: SheetKey[] = ["financeiro", "milestones", "estrategia", "riscos"];
      const needsAI = selectedSheets.some((s) => aiSheets.includes(s));
      const reportContent: ReportContent = needsAI
        ? await generateReportContent(proposal, transactions, options)
        : {};

      await exportToExcel(proposal, transactions, reportContent, options);
      onToast("Relatório Excel gerado com sucesso.");
      onClose();
    } catch {
      setError("Erro ao gerar relatório. Verifique a chave da API e tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Relatório Excel</span>
            <strong>Configurar e gerar planilha</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className="report-modal-body">
          <div className="report-proposal-select">
            <span>Proposta de referência</span>
            <select value={selectedProposalId} onChange={(e) => setSelectedProposalId(e.target.value)}>
              <option value="geral">Visão geral — todas as propostas e transações</option>
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clienteNome} — {p.servicoPrincipal}
                </option>
              ))}
            </select>
          </div>
          <div className="report-sheet-checkboxes">
            <span>Abas do relatório</span>
            {SHEET_DEFS.map((def) => (
              <label
                key={def.key}
                className={`sheet-checkbox-item ${selectedSheets.includes(def.key) ? "checked" : ""}`}
              >
                <span className="sheet-icon">{def.icon}</span>
                <div className="sheet-checkbox-copy">
                  <strong>{def.label}</strong>
                  <small>{def.desc}</small>
                </div>
                <input
                  type="checkbox"
                  className="sheet-toggle"
                  checked={selectedSheets.includes(def.key)}
                  onChange={() => toggleSheet(def.key)}
                />
              </label>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" onClick={handleGenerate} disabled={generating}>
            {generating
              ? <><Sparkles size={15} className="spin" /> Gerando...</>
              : <><Download size={15} /> Gerar Excel</>}
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

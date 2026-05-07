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
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import React, { FormEvent, ReactNode, useMemo, useState } from "react";

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

const financialKpis = [
  { label: "Clientes totais", value: "0", note: "Base inteira, não apenas o mês", accent: "gold" },
  { label: "Recebimentos do ciclo", value: "R$ 0", note: "Entradas de 07 a 07", accent: "green" },
  { label: "Custos do ciclo", value: "R$ 0", note: "Saídas operacionais no período", accent: "red" },
  { label: "Faturamento líquido", value: "R$ 0", note: "Recebimentos menos custos", accent: "gold" },
  { label: "Margem líquida", value: "0%", note: "Resultado sobre recebimentos", accent: "green" },
  { label: "Contas a receber", value: "R$ 0", note: "Vencimentos até o próximo dia 7", accent: "gold" },
];

const nextActions = [
  "Registrar primeira receita ou despesa",
  "Cadastrar primeiro cliente",
  "Criar proposta com IA",
];

const timeline = [
  { title: "Workspace criado", text: "A base está pronta para receber dados reais.", status: "complete" },
  { title: "Dados financeiros", text: "Importe OFX, CSV ou conecte Open Finance.", status: "next" },
  { title: "Inteligência diária", text: "Insights aparecem quando houver histórico suficiente.", status: "idle" },
];

const cycleFilters = ["Ciclo atual", "Ciclo anterior", "Trimestre", "Ano"];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const monthlyFlow = [
  { label: "07", receita: 0, despesa: 0 },
  { label: "12", receita: 0, despesa: 0 },
  { label: "17", receita: 0, despesa: 0 },
  { label: "22", receita: 0, despesa: 0 },
  { label: "27", receita: 0, despesa: 0 },
  { label: "02", receita: 0, despesa: 0 },
  { label: "07", receita: 0, despesa: 0 },
];

const annualFlow = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
].map((label) => ({ label, receita: 0, despesa: 0 }));

const expenseMix = [
  { label: "Equipe", value: 0, tone: "gold" },
  { label: "Ferramentas", value: 0, tone: "green" },
  { label: "Marketing", value: 0, tone: "red" },
  { label: "Operação", value: 0, tone: "neutral" },
];

type TransactionKind = "receita" | "despesa";

type Client = {
  id: number;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  segmento: string;
  site: string;
  observacoes: string;
};

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      <Sidebar
        activePage={activePage}
        sidebarOpen={sidebarOpen}
        onNavigate={setActivePage}
      />
      <Topbar
        activeLabel={activeLabel}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        onOpenCommand={() => setCommandOpen(true)}
        onToggleCopilot={() => setCopilotOpen((value) => !value)}
      />
      <main className="workspace">
        {activePage === "dashboard" && (
          <DashboardPage
            onCreateProposal={openProposal}
            onToast={showToast}
          />
        )}
        {activePage === "financeiro" && (
          <FinancePage
            onToast={showToast}
            clients={clients}
          />
        )}
        {activePage === "clientes" && (
          <ClientesPage
            clients={clients}
            onNewClient={() => setClientModalOpen(true)}
          />
        )}
        {activePage === "propostas" && (
          <ProposalsPage onCreate={openProposal} onToast={showToast} />
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
        {activePage === "configuracoes" && (
          <SettingsPage onToast={showToast} />
        )}
      </main>
      {copilotOpen && (
        <CopilotPanel
          onClose={() => setCopilotOpen(false)}
          onAsk={(message) => {
            showToast(message);
          }}
        />
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
          onClose={() => setProposalOpen(false)}
          onDone={() => {
            setProposalOpen(false);
            showToast("Proposta criada em rascunho.");
          }}
        />
      )}
      {clientModalOpen && (
        <ClientFormModal
          onClose={() => setClientModalOpen(false)}
          onSave={(data) => {
            setClients((prev) => [...prev, { ...data, id: Date.now() }]);
            setClientModalOpen(false);
            showToast(`Cliente ${data.nome} cadastrado.`);
          }}
        />
      )}
      <ToastHost toasts={toasts} />
    </div>
  );
}

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

function DashboardPage({
  onToast,
}: {
  onCreateProposal: () => void;
  onToast: (message: string) => void;
}) {
  const [range, setRange] = useState(cycleFilters[0]);

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
            <button
              key={item}
              className={range === item ? "active" : ""}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="kpi-grid financial-kpis">
        {financialKpis.map((item) => (
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
              ["Ponto de equilíbrio", "R$ 0"],
              ["Inadimplência", "0%"],
              ["Ticket médio", "R$ 0"],
              ["Burn mensal", "R$ 0"],
              ["Runway estimado", "0 meses"],
            ].map(([label, value]) => (
              <div className="finance-list-row" key={label}>
                <div>
                  <strong>{label}</strong>
                  <p>Aguardando dados financeiros</p>
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
          <ExpenseMixChart />
        </Card>
      </section>

      <section className="soft-grid finance-priority-grid">
        <InsightCard
          icon={<CalendarDays size={20} />}
          title="Contas do ciclo"
          text="Recebíveis, pagamentos e vencimentos sempre organizados no período 07→07."
        />
        <InsightCard
          icon={<Activity size={20} />}
          title="Fluxo de caixa"
          text="Acompanhe saldo projetado, custo mensal, margem e necessidade de capital."
        />
        <InsightCard
          icon={<Bot size={20} />}
          title="Alertas da IA"
          text="Quando houver dados, a IA destaca variações, riscos e oportunidades financeiras."
        />
      </section>
    </div>
  );
}

function FinancePage({ onToast, clients }: { onToast: (message: string) => void; clients: Client[] }) {
  const [transactionKind, setTransactionKind] = useState<TransactionKind | null>(null);
  const [transactionChooserOpen, setTransactionChooserOpen] = useState(false);

  const openTransaction = (kind?: TransactionKind) => {
    if (kind) {
      setTransactionKind(kind);
      setTransactionChooserOpen(false);
      return;
    }
    setTransactionChooserOpen(true);
  };

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
          ["Receitas registradas", currency.format(0), "Nenhuma receita lançada"],
          ["Despesas registradas", currency.format(0), "Nenhuma despesa lançada"],
          ["Resultado do ciclo", currency.format(0), "Receitas menos despesas"],
        ].map(([label, value, note]) => (
          <Card className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{note}</p>
          </Card>
        ))}
      </section>
      <Card className="empty-composer">
        <CreditCard size={26} />
        <h3>Nenhum lançamento registrado ainda.</h3>
        <p>Registre uma receita ou despesa para começar a montar caixa, margem, categorias e visão mensal 07→07.</p>
        <button className="primary-button" onClick={() => openTransaction()}>
          <Plus size={18} />
          Registrar transação
        </button>
      </Card>
      {transactionChooserOpen && (
        <TransactionTypeModal
          onClose={() => setTransactionChooserOpen(false)}
          onSelect={openTransaction}
        />
      )}
      {transactionKind && (
        <TransactionFormModal
          kind={transactionKind}
          clients={clients}
          onBack={() => {
            setTransactionKind(null);
            setTransactionChooserOpen(true);
          }}
          onClose={() => setTransactionKind(null)}
          onSave={() => {
            setTransactionKind(null);
            onToast(`${transactionKind === "receita" ? "Receita" : "Despesa"} registrada.`);
          }}
        />
      )}
    </div>
  );
}

function TransactionTypeModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (kind: TransactionKind) => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="transaction-modal small" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Nova transação</span>
            <strong>O que você quer registrar?</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={17} />
          </button>
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
  onSave: () => void;
}) {
  const isRevenue = kind === "receita";
  const title = isRevenue ? "Registrar receita" : "Registrar despesa";
  const subtitle = isRevenue
    ? "Informe o cliente, valor e condição do recebimento."
    : "Informe o fornecedor, categoria, valor e vencimento do custo.";

  const save = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="transaction-modal" onClick={(event) => event.stopPropagation()} onSubmit={save}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">{isRevenue ? "Entrada de caixa" : "Saída de caixa"}</span>
            <strong>{title}</strong>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>
        <div className="transaction-intro">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="transaction-form-grid">
          <label>
            <span>Valor</span>
            <input required inputMode="decimal" placeholder="R$ 0,00" />
          </label>

          {isRevenue ? (
            <label>
              <span>Cliente</span>
              <select required defaultValue="">
                <option value="" disabled>
                  {clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione um cliente"}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.nome}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <span>Fornecedor</span>
              <input required placeholder="Ex: Google, Meta, contador..." />
            </label>
          )}

          <label>
            <span>{isRevenue ? "Serviço ou contrato" : "Categoria"}</span>
            {isRevenue ? (
              <input placeholder="Ex: Gestão mensal, projeto, consultoria..." />
            ) : (
              <select defaultValue="">
                <option value="" disabled>Selecione uma categoria</option>
                <option>Equipe</option>
                <option>Ferramentas</option>
                <option>Marketing</option>
                <option>Operação</option>
                <option>Impostos</option>
                <option>Outros</option>
              </select>
            )}
          </label>

          <label>
            <span>{isRevenue ? "Data de recebimento" : "Data de vencimento"}</span>
            <input required type="date" />
          </label>

          <label>
            <span>Status</span>
            <select defaultValue={isRevenue ? "pendente" : "aberta"}>
              {isRevenue ? (
                <>
                  <option value="recebida">Recebida</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasada">Atrasada</option>
                </>
              ) : (
                <>
                  <option value="paga">Paga</option>
                  <option value="aberta">Em aberto</option>
                  <option value="atrasada">Atrasada</option>
                </>
              )}
            </select>
          </label>

          <label>
            <span>Forma de pagamento</span>
            <select defaultValue="">
              <option value="" disabled>Selecione</option>
              <option>Pix</option>
              <option>Boleto</option>
              <option>Cartão</option>
              <option>Transferência</option>
              <option>Dinheiro</option>
            </select>
          </label>

          {!isRevenue && (
            <label>
              <span>Centro de custo</span>
              <select defaultValue="">
                <option value="" disabled>Selecione</option>
                <option>Administrativo</option>
                <option>Comercial</option>
                <option>Operação</option>
                <option>Produto</option>
              </select>
            </label>
          )}

          <label>
            <span>{isRevenue ? "Recorrência" : "Repetir despesa"}</span>
            <select defaultValue="nao">
              <option value="nao">Não recorrente</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </label>

          <label className="wide">
            <span>Observações</span>
            <textarea rows={4} placeholder="Contexto, nota fiscal, condição comercial ou detalhes importantes..." />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onBack}>Voltar</button>
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            Salvar {isRevenue ? "receita" : "despesa"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProposalsPage({
  onCreate,
  onToast,
}: {
  onCreate: () => void;
  onToast: (message: string) => void;
}) {
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
          ["Rascunhos", "0", "Nada pendente"],
          ["Enviadas", "0", "Sem envios"],
          ["Aprovadas", "0", "Sem aprovações"],
        ].map(([label, value, note]) => (
          <Card className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{note}</p>
          </Card>
        ))}
      </section>
      <Card className="empty-composer">
        <BriefcaseBusiness size={28} />
        <h3>Comece com uma proposta de teste.</h3>
        <p>A IA pode estruturar escopo, cronograma, investimento e versões para decisores.</p>
        <div className="button-row">
          <button className="primary-button" onClick={onCreate}>
            <WandSparkles size={18} />
            Criar proposta
          </button>
          <button className="secondary-button" onClick={() => onToast("Templates preparados.")}>
            <FileText size={18} />
            Ver templates
          </button>
        </div>
      </Card>
    </div>
  );
}

function SettingsPage({ onToast }: { onToast: (message: string) => void }) {
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
            <button>
              <CheckCircle2 size={16} />
              Ativo
            </button>
          </Card>
        ))}
      </section>
    </div>
  );
}

function EmptyModule({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="page">
      <ModuleHeader
        eyebrow={title}
        title={`${title} com clareza operacional.`}
        subtitle={subtitle}
        action={action}
        onAction={onAction}
      />
      <Card className="empty-composer large">
        {icon}
        <h3>Este módulo está pronto para receber dados.</h3>
        <p>O layout permanece limpo enquanto o workspace ainda está em ativação.</p>
        <button className="primary-button" onClick={onAction}>
          <Plus size={18} />
          {action}
        </button>
      </Card>
    </div>
  );
}

function ModuleHeader({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="module-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <button className="primary-button" onClick={onAction}>
        <Plus size={18} />
        {action}
      </button>
    </section>
  );
}

function FinancialBarChart({
  data,
  compact = false,
}: {
  data: Array<{ label: string; receita: number; despesa: number }>;
  compact?: boolean;
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
              <span
                className="revenue-bar"
                style={{ height: `${hasData ? Math.max(8, (item.receita / max) * 100) : 8}%` }}
              />
              <span
                className="expense-bar"
                style={{ height: `${hasData ? Math.max(8, (item.despesa / max) * 100) : 8}%` }}
              />
            </div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
      {!hasData && <p className="chart-empty-label">Aguardando lançamentos para preencher o gráfico.</p>}
    </div>
  );
}

function ExpenseMixChart() {
  const total = expenseMix.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="expense-mix">
      <div className={total > 0 ? "mix-ring" : "mix-ring empty"}>
        <span>0%</span>
      </div>
      <div className="mix-list">
        {expenseMix.map((item) => (
          <div className="mix-row" key={item.label}>
            <span>
              <i className={`legend-dot ${item.tone}`} />
              {item.label}
            </span>
            <strong>{item.value}%</strong>
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

function CopilotPanel({
  onClose,
  onAsk,
}: {
  onClose: () => void;
  onAsk: (message: string) => void;
}) {
  return (
    <aside className="copilot-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Copilot</span>
          <strong>Orientação executiva</strong>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar">
          <X size={17} />
        </button>
      </div>
      <div className="copilot-body">
        <Card className="assistant-note">
          <Sparkles size={20} />
          <p>O workspace está em ativação. Posso ajudar você a começar pelo caminho mais rápido.</p>
        </Card>
        {nextActions.map((action) => (
          <button
            className="copilot-action"
            key={action}
            onClick={() => {
              onAsk(action);
              onClose();
            }}
          >
            {action}
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </aside>
  );
}

function CommandPalette({
  onClose,
  onNavigate,
  onCreateProposal,
  onOpenCopilot,
}: {
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onCreateProposal: () => void;
  onOpenCopilot: () => void;
}) {
  const [query, setQuery] = useState("");
  const commands = useMemo(
    () => [
      ...navItems.map((item) => ({
        label: `Ir para ${item.label}`,
        icon: item.icon,
        run: () => onNavigate(item.id),
      })),
      {
        label: "Criar proposta com IA",
        icon: <WandSparkles size={18} />,
        run: onCreateProposal,
      },
      {
        label: "Abrir Copilot",
        icon: <Sparkles size={18} />,
        run: onOpenCopilot,
      },
    ],
    [onCreateProposal, onNavigate, onOpenCopilot],
  );
  const filtered = commands.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Command size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ação..."
          />
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="command-list">
          {filtered.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.run();
                onClose();
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProposalModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = ["Cliente", "Escopo", "Investimento", "Revisão"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="proposal-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Proposta IA</span>
            <strong>Fluxo premium guiado</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>
        <div className="step-line">
          {steps.map((label, index) => (
            <button
              key={label}
              className={index === step ? "active" : index < step ? "done" : ""}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="proposal-body">
          {step === 0 && (
            <FormStep
              title="Quem vai receber a proposta?"
              fields={["Nome do cliente", "Serviço principal", "Objetivo do projeto"]}
            />
          )}
          {step === 1 && (
            <FormStep
              title="Defina o escopo com clareza."
              fields={["Entregáveis", "Prazo esperado", "Critérios de sucesso"]}
            />
          )}
          {step === 2 && (
            <FormStep
              title="Organize o investimento."
              fields={["Valor total", "Condição de pagamento", "Observações comerciais"]}
            />
          )}
          {step === 3 && (
            <div className="review-state">
              <Sparkles size={30} />
              <h3>Pronto para gerar a versão executiva.</h3>
              <p>A IA vai transformar o contexto em um rascunho elegante, objetivo e fácil de revisar.</p>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button
            className="primary-button"
            onClick={() => (step === steps.length - 1 ? onDone() : setStep(step + 1))}
          >
            {step === steps.length - 1 ? "Gerar rascunho" : "Continuar"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FormStep({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="form-step">
      <h3>{title}</h3>
      <div className="form-grid">
        {fields.map((field, index) => (
          <label key={field} className={index === fields.length - 1 ? "wide" : ""}>
            <span>{field}</span>
            {index === fields.length - 1 ? <textarea rows={4} /> : <input />}
          </label>
        ))}
      </div>
    </div>
  );
}

function ClientesPage({
  clients,
  onNewClient,
}: {
  clients: Client[];
  onNewClient: () => void;
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
            <Plus size={18} />
            Cadastrar cliente
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
  onSave: (data: Omit<Client, "id">) => void;
}) {
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
    segmento: "",
    site: "",
    observacoes: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="transaction-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Cadastro</span>
            <strong>Novo cliente</strong>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>
        <div className="transaction-intro">
          <h3>Cadastrar cliente</h3>
          <p>Preencha os dados do cliente para vinculá-lo a receitas, propostas e histórico.</p>
        </div>
        <div className="transaction-form-grid">
          <label>
            <span>Nome / Razão social *</span>
            <input required placeholder="Ex: Acme Ltda." value={form.nome} onChange={set("nome")} />
          </label>
          <label>
            <span>CNPJ</span>
            <input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={set("cnpj")} />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" placeholder="contato@empresa.com" value={form.email} onChange={set("email")} />
          </label>
          <label>
            <span>Telefone</span>
            <input placeholder="(11) 99999-0000" value={form.telefone} onChange={set("telefone")} />
          </label>
          <label>
            <span>Responsável / Contato</span>
            <input placeholder="Nome do ponto focal" value={form.responsavel} onChange={set("responsavel")} />
          </label>
          <label>
            <span>Segmento</span>
            <select value={form.segmento} onChange={set("segmento")}>
              <option value="">Selecione</option>
              <option>Agência</option>
              <option>Consultoria</option>
              <option>E-commerce</option>
              <option>Educação</option>
              <option>Indústria</option>
              <option>Saúde</option>
              <option>Tecnologia</option>
              <option>Varejo</option>
              <option>Outro</option>
            </select>
          </label>
          <label className="wide">
            <span>Site</span>
            <input type="url" placeholder="https://empresa.com.br" value={form.site} onChange={set("site")} />
          </label>
          <label className="wide">
            <span>Observações</span>
            <textarea rows={4} placeholder="Contexto do relacionamento, origem, notas..." value={form.observacoes} onChange={set("observacoes")} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">
            Cadastrar cliente
          </button>
        </div>
      </form>
    </div>
  );
}

function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <Sparkles size={16} />
          {toast.message}
        </div>
      ))}
    </div>
  );
}

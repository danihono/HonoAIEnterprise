import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export type Client = {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  segmento: string;
  site: string;
  observacoes: string;
  cardColor?: string;
  cardIcon?: string;
  createdAt?: unknown;
};

export type TransactionKind = "receita" | "despesa";

export type TransactionOccurrenceOverride = {
  status?: string;
  valor?: string;
  data?: string;
  pagamento?: string;
  observacoes?: string;
  deleted?: boolean;
};

export type TransactionOccurrences = Record<string, string | TransactionOccurrenceOverride>;

export type Transaction = {
  id: string;
  kind: TransactionKind;
  valor: string;
  clienteId?: string;
  clienteNome?: string;
  fornecedor?: string;
  servico?: string;
  categoria?: string;
  data: string;
  dataFim?: string;
  numParcelas?: number;
  status: string;
  pagamento: string;
  centroCusto?: string;
  recorrencia: string;
  ocorrencias?: TransactionOccurrences;
  observacoes: string;
  createdAt?: unknown;
};

export type Proposal = {
  id: string;
  clienteNome: string;
  servicoPrincipal: string;
  objetivo: string;
  entregaveis: string;
  prazo: string;
  criterios: string;
  valorTotal: string;
  condicao: string;
  observacoes: string;
  status: "rascunho" | "enviada" | "aprovada";
  generatedText?: string;
  documentSections?: string;
  docStyle?: string;
  lineItems?: string;
  qualityChecklist?: string;
  templateSnapshot?: string;
  createdAt?: unknown;
};

export type CatalogBillingCycle = "unico" | "mensal";

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  billingCycle: CatalogBillingCycle;
  active: boolean;
  createdAt?: unknown;
};

export type ProposalLineItem = {
  id: string;
  name: string;
  description?: string;
  price: string;
  billingCycle: CatalogBillingCycle;
};

export type ProposalTemplatePreferences = {
  companyName: string;
  footerText: string;
  accentColor: string;
  logoDataUrl?: string;
  updatedAt?: unknown;
};

export const DEFAULT_PROPOSAL_TEMPLATE: ProposalTemplatePreferences = {
  companyName: "Minha Empresa",
  footerText: "Documento Confidencial - Gerado por Hono AI",
  accentColor: "#2563eb",
};

// ── Clients ──────────────────────────────────────────────────────────────────

export function subscribeClients(cb: (clients: Client[]) => void) {
  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
  });
}

export async function addClient(data: Omit<Client, "id" | "createdAt">) {
  await addDoc(collection(db, "clients"), { ...data, createdAt: serverTimestamp() });
}

export async function updateClient(id: string, data: Partial<Client>) {
  await updateDoc(doc(db, "clients", id), data);
}

export async function deleteClient(id: string) {
  await deleteDoc(doc(db, "clients", id));
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function subscribeTransactions(cb: (transactions: Transaction[]) => void) {
  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction)));
  });
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  );
}

function normalizeUpdate(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === undefined ? deleteField() : stripUndefined(value),
    ])
  );
}

export async function addTransaction(data: Omit<Transaction, "id" | "createdAt">) {
  await addDoc(collection(db, "transactions"), stripUndefined({ ...data, createdAt: serverTimestamp() }));
}

export async function updateTransaction(id: string, data: Partial<Transaction>) {
  await updateDoc(doc(db, "transactions", id), normalizeUpdate(data as Record<string, unknown>));
}

export async function deleteTransaction(id: string) {
  await deleteDoc(doc(db, "transactions", id));
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export function subscribeProposals(cb: (proposals: Proposal[]) => void) {
  const q = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Proposal)));
  });
}

export async function addProposal(data: Omit<Proposal, "id" | "createdAt">) {
  await addDoc(collection(db, "proposals"), { ...data, createdAt: serverTimestamp() });
}

export async function updateProposal(id: string, data: Partial<Proposal>) {
  await updateDoc(doc(db, "proposals", id), data);
}

export async function deleteProposal(id: string) {
  await deleteDoc(doc(db, "proposals", id));
}

// Catalog

export function subscribeCatalogItems(cb: (items: CatalogItem[]) => void) {
  const q = query(collection(db, "catalogItems"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CatalogItem)));
  });
}

export async function addCatalogItem(data: Omit<CatalogItem, "id" | "createdAt">) {
  await addDoc(collection(db, "catalogItems"), { ...data, createdAt: serverTimestamp() });
}

export async function updateCatalogItem(id: string, data: Partial<CatalogItem>) {
  await updateDoc(doc(db, "catalogItems", id), normalizeUpdate(data as Record<string, unknown>));
}

export async function deleteCatalogItem(id: string) {
  await deleteDoc(doc(db, "catalogItems", id));
}

// Proposal template preferences

export function subscribeProposalTemplatePreferences(cb: (prefs: ProposalTemplatePreferences) => void) {
  return onSnapshot(doc(db, "workspaceSettings", "proposalTemplate"), (snap) => {
    cb({ ...DEFAULT_PROPOSAL_TEMPLATE, ...(snap.exists() ? snap.data() : {}) } as ProposalTemplatePreferences);
  });
}

export async function saveProposalTemplatePreferences(data: ProposalTemplatePreferences) {
  await setDoc(
    doc(db, "workspaceSettings", "proposalTemplate"),
    stripUndefined({ ...data, updatedAt: serverTimestamp() }) as Record<string, unknown>,
    { merge: true }
  );
}

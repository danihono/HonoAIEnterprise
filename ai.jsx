/* Hono AI Enterprise — IA Central + Copilot */

const SUGGESTED_PROMPTS = [
  { cat: "ONBOARDING", q: "Como começo a usar o Hono AI Enterprise?" },
  { cat: "DADOS", q: "Como importo meus dados financeiros?" },
  { cat: "COMERCIAL", q: "Crie uma proposta de exemplo para eu testar" },
  { cat: "CONFIGURAÇÃO", q: "Quais integrações estão disponíveis?" },
  { cat: "RELATÓRIO", q: "Que tipos de relatórios você gera?" },
  { cat: "SIMULAÇÃO", q: "Mostre uma simulação de margem de 35%" },
];

const aiToast = (m) => window.dispatchEvent(new CustomEvent('hono-toast', { detail: m }));

const renderBlock = (b, key) => {
  if (b.type === "p") return <p key={key}>{b.text}{b.partial && <span className="cursor-blink"/>}</p>;
  if (b.type === "list") return (
    <ul key={key} style={{ margin: "8px 0", paddingLeft: 0, listStyle: "none" }}>
      {b.items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < b.items.length - 1 ? "1px solid var(--line-1)" : "" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)", fontSize: 11, flexShrink: 0, paddingTop: 2 }}>0{i+1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
  if (b.type === "actions") return (
    <div key={key} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      {b.items.map((a, i) => (
        <button key={i} className={`btn sm ${i === 0 ? "primary" : ""}`} onClick={() => aiToast(a)}>{a}</button>
      ))}
    </div>
  );
  return null;
};

// Estática, simulando "primeiro contato" — sem números mockados
const buildResponse = (prompt) => {
  const blocks = [
    { type: "p", text: `Olá Daniel — recebi sua mensagem sobre "${prompt}".` },
    { type: "p", text: "Seu workspace ainda está vazio. Posso te ajudar das seguintes formas:" },
    { type: "list", items: [
      "Importar extrato bancário (OFX, CSV ou conexão Open Finance)",
      "Cadastrar seu primeiro cliente e gerar uma proposta de exemplo",
      "Configurar categorias e centros de custo do seu negócio",
      "Conectar integrações (NF-e, Stripe, Asaas, Banco Inter, etc.)"
    ]},
    { type: "p", text: "Qual desses caminhos faz mais sentido para começar agora?" },
    { type: "actions", items: ["Importar dados", "Criar proposta de exemplo", "Configurar workspace"] },
  ];
  return blocks;
};

const useStreaming = (active, prompt, onDone) => {
  const [content, setContent] = React.useState([]);
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!active) { setContent([]); setDone(false); return; }
    const seq = buildResponse(prompt);
    let i = 0, block = 0, cancelled = false;
    setContent([]); setDone(false);
    const next = () => {
      if (cancelled) return;
      if (block >= seq.length) { setDone(true); onDone && onDone(); return; }
      const blk = seq[block];
      if (blk.type === "p") {
        if (i <= blk.text.length) {
          setContent(prev => {
            const c = [...prev];
            c[block] = { ...blk, text: blk.text.slice(0, i), partial: i < blk.text.length };
            return c;
          });
          i += 4;
          setTimeout(next, 14);
        } else { block++; i = 0; setTimeout(next, 200); }
      } else {
        setContent(prev => { const c = [...prev]; c[block] = blk; return c; });
        block++; i = 0;
        setTimeout(next, 280);
      }
    };
    next();
    return () => { cancelled = true; };
  }, [active, prompt]);
  return { content, done };
};

const AICentral = ({ initialPrompt }) => {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [currentPrompt, setCurrentPrompt] = React.useState("");
  const scrollRef = React.useRef(null);
  const { content: streamContent, done } = useStreaming(streaming, currentPrompt, () => setStreaming(false));

  React.useEffect(() => { if (initialPrompt) submit(initialPrompt); }, [initialPrompt]);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streamContent, messages]);

  const submit = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", content: text }]);
    setInput("");
    setCurrentPrompt(text);
    setStreaming(true);
  };

  React.useEffect(() => {
    if (done && streamContent.length) {
      setMessages(m => [...m, { role: "ai", content: [...streamContent] }]);
    }
  }, [done]);

  const showSuggest = messages.length === 0 && !streaming;
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-0)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line-1)", background: "var(--bg-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, var(--gold-deep), #2a1f0a)", color: "var(--gold-soft)", display: "grid", placeItems: "center", border: "1px solid var(--gold-deep)" }}>
            <Icon name="sparkles" size={14}/>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>IA Central</div>
            <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Pronta para ajudar · workspace vazio · GPT-5 / Claude 4.5</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn sm ghost" onClick={() => aiToast("Conversa exportada (simulação)")}><Icon name="download" size={11}/> Exportar</button>
          <button className="btn sm" onClick={() => { setMessages([]); setStreaming(false); }}>Nova conversa</button>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        {showSuggest ? (
          <div style={{ padding: "60px 24px 24px", maxWidth: 820, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
                Como posso ajudar, <span style={{ color: "var(--gold)" }}>Daniel</span>?
              </div>
              <div style={{ color: "var(--fg-3)", fontSize: 13 }}>
                Seu workspace está vazio. Posso te guiar pelos primeiros passos.
              </div>
            </div>
            <div className="suggest-grid">
              {SUGGESTED_PROMPTS.map((s, i) => (
                <div key={i} className="suggest" onClick={() => submit(s.q)}>
                  <span className="sg-cat">{s.cat}</span>
                  <span className="sg-q">{s.q}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="role-icon">{m.role === "user" ? "DA" : <Icon name="sparkles" size={12}/>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="role-label">{m.role === "user" ? `DANIEL · ${time}` : `HONO IA · ${time}`}</div>
                  <div className="content">
                    {typeof m.content === "string" ? <p>{m.content}</p> : m.content.map((b, j) => renderBlock(b, j))}
                  </div>
                </div>
              </div>
            ))}
            {streaming && streamContent.length > 0 && (
              <div className="chat-msg ai">
                <div className="role-icon"><Icon name="sparkles" size={12}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="role-label">HONO IA · ANALISANDO…</div>
                  <div className="content">{streamContent.filter(Boolean).map((b, j) => renderBlock(b, j))}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-input-wrap">
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="chat-input-shell">
            <textarea
              placeholder="Pergunte algo, ou peça para criar uma proposta, simular cenário, exportar relatório…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
              rows={1}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn sm ghost" title="Anexar" onClick={() => aiToast("Anexar arquivo (em breve)")}><Icon name="docs" size={12}/></button>
              <button className="btn primary sm" onClick={() => submit(input)}><Icon name="send" size={11}/></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            <span>⏎ ENVIAR</span><span>⇧⏎ NOVA LINHA</span><span>⌘K PALETA</span>
            <span style={{ marginLeft: "auto" }}>RESPOSTAS DA IA SÃO ASSISTIVAS — VERIFIQUE NÚMEROS CRÍTICOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Copilot = ({ onClose, onAsk }) => {
  const [input, setInput] = React.useState("");
  const submit = () => {
    if (!input.trim()) return;
    onAsk && onAsk(input);
    setInput("");
    onClose();
  };
  return (
    <div className="copilot">
      <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--line-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="sparkles" size={14}/>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Copilot</div>
          <span className="pill warn" style={{ fontSize: 9 }}>STANDBY</span>
        </div>
        <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="close" size={12}/></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-3)", fontWeight: 600 }}>STATUS</div>
        <div className="ai-chip">
          <span className="ai-chip-icon"><Icon name="sparkles" size={14}/></span>
          <div>
            <strong>Workspace vazio.</strong>
            <div style={{ marginTop: 3 }}>Importe seus dados para que eu comece a gerar insights diários.</div>
          </div>
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-3)", fontWeight: 600, marginTop: 8 }}>PRIMEIROS PASSOS</div>
        {[
          { l: "Importar extrato bancário", a: "import-bank" },
          { l: "Criar primeiro cliente", a: "new-client" },
          { l: "Gerar proposta de exemplo", a: "new-proposal" },
          { l: "Configurar categorias", a: "categories" },
        ].map((s, i) => (
          <button key={i} className="btn sm" style={{ justifyContent: "flex-start", height: 32, width: "100%" }}
            onClick={() => { onAsk && onAsk(s.l); onClose(); }}>
            <Icon name="chev_right" size={11}/> {s.l}
          </button>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid var(--line-1)" }}>
        <div className="chat-input-shell">
          <textarea placeholder="Pergunte ao Copilot…" rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}/>
          <button className="btn primary sm" onClick={submit}><Icon name="send" size={11}/></button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AICentral, Copilot });

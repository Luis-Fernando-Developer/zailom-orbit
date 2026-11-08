
import { useMemo, useState, type ReactNode } from "react";
import LoadingDash from "./LoadingDashboard/LoadingDash";

type IconName = "grid" | "calendar" | "layers" | "inbox" | "zap" | "chart" | "settings" | "search" | "bell" | "plus" | "chevron" | "more" | "instagram" | "arrow" | "clock" | "heart" | "message" | "eye" | "send" | "filter" | "spark" | "menu" | "close";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    inbox: <><path d="M4 4h16l2 11v5H2v-5L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/></>,
    zap: <path d="m13 2-3 9h7l-6 11 2-9H6l7-11Z"/>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z" transform="translate(-1 -1) scale(1.08)"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    heart: <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.8-4.4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 2.5 2 1-2 1L19 21l-1-2.5-2-1-2-1 1-2.5Z"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

const navigation: { label: string; items: { id: string; label: string; icon: IconName; count?: string }[] }[] = [
  { label: "WORKSPACE", items: [{ id: "overview", label: "Visão geral", icon: "grid" }, { id: "calendar", label: "Calendário", icon: "calendar" }, { id: "content", label: "Publicações", icon: "layers" }, { id: "inbox", label: "Caixa de entrada", icon: "inbox", count: "8" }] },
  { label: "INTELIGÊNCIA", items: [{ id: "automations", label: "Automações", icon: "zap" }, { id: "analytics", label: "Análises", icon: "chart" }] },
];

const posts = [
  { id: 1, title: "Bastidores da nossa nova coleção", type: "Carrossel", status: "Publicado", date: "Hoje, 09:42", likes: "1.284", comments: "86", reach: "8,4 mil", tone: "sand", initials: "01" },
  { id: 2, title: "5 dicas para transformar sua rotina", type: "Reels", status: "Agendado", date: "Hoje, 18:30", likes: "—", comments: "—", reach: "—", tone: "sage", initials: "02" },
  { id: 3, title: "Uma pausa para inspirar", type: "Imagem", status: "Rascunho", date: "Ontem, 16:10", likes: "—", comments: "—", reach: "—", tone: "clay", initials: "03" },
];

const upcoming = [
  { day: "08", month: "NOV", time: "18:30", title: "5 dicas para transformar sua rotina", type: "Reels", tone: "sage" },
  { day: "10", month: "NOV", time: "12:00", title: "Conheça os detalhes de perto", type: "Carrossel", tone: "sand" },
  { day: "12", month: "NOV", time: "19:15", title: "O que vem por aí...", type: "Story", tone: "clay" },
];

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [active, setActive] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState("7 dias");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const activeLabel = useMemo(() => navigation.flatMap(group => group.items).find(item => item.id === active)?.label ?? "Configurações", [active]);

  const selectPage = (id: string) => { setActive(id); setMobileOpen(false); };
  const createPost = () => setNotice("Editor de publicação: em preparação para a próxima etapa.");
  const filteredPosts = posts.filter(post => post.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {showLoading && (
        <LoadingDash onComplete={() => setShowLoading(false)} />
      )}
      <div className="app-shell">
      
        <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
          <button className="brand" onClick={() => selectPage("overview")} aria-label="Ir para visão geral">
            <span className="brand-symbol">o<span>.</span></span>
            <span className="brand-copy"><strong>zailom</strong><small>ORBIT</small></span>
          </button>
          <div className="workspace-switch">
            <div className="workspace-avatar">M</div>
            <div className="workspace-name"><strong>Minha marca</strong><span>Instagram conectado em breve</span></div>
            <span className="switch-chevron">⌄</span>
          </div>
          <nav className="side-nav">
            {navigation.map(group => <div className="nav-group" key={group.label}>
              <p className="nav-heading">{group.label}</p>
              {group.items.map(item => <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => selectPage(item.id)}>
                <Icon name={item.icon}/><span>{item.label}</span>{item.count && <small>{item.count}</small>}
              </button>)}
            </div>)}
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card"><div className="help-icon"><Icon name="spark" size={16}/></div><strong>Seu próximo passo</strong><p>Conecte seu Instagram para liberar todo o potencial do Orbit.</p><button onClick={() => setNotice("A conexão oficial com Instagram será ativada na próxima etapa.")}>Conectar conta <Icon name="arrow" size={14}/></button></div>
            <button className={`nav-item ${active === "settings" ? "active" : ""}`} onClick={() => selectPage("settings")}><Icon name="settings"/><span>Configurações</span></button>
            <div className="profile-row"><div className="profile-avatar">LF</div><div><strong>Luis Fernando</strong><span>Administrador</span></div><button aria-label="Mais opções"><Icon name="more"/></button></div>
          </div>
        </aside>

        {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"/>}
        <main className="main-area">
          <header className="topbar">
            <div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Icon name="menu"/></button><div className="breadcrumb">Workspace <Icon name="chevron" size={13}/> <strong>{activeLabel}</strong></div></div>
            <div className="topbar-actions">
              <label className="search-box"><Icon name="search" size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no Orbit..."/><kbd>⌘ K</kbd></label>
              <button className="icon-button notification-button" aria-label="Notificações" onClick={() => setNotice("Você está em dia. Nenhuma notificação nova.")}><Icon name="bell"/><i/></button>
              <div className="top-avatar">LF</div>
            </div>
          </header>

          <div className="page-content">
            {active === "overview" ? <>
              <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> SEU PAINEL DE CONTROLE</div><h1>Bom dia, Luis <span>✳</span></h1><p>Acompanhe sua presença digital em um só lugar.</p></div><button className="primary-button" onClick={createPost}><Icon name="plus" size={17}/> Criar publicação</button></section>
              <section className="connect-banner"><div className="connect-symbol"><Icon name="instagram" size={23}/></div><div className="connect-copy"><strong>Seu Instagram ainda não está conectado</strong><span>Conecte uma conta profissional para começar a publicar, acompanhar métricas e gerenciar mensagens.</span></div><button onClick={() => setNotice("A integração OAuth do Instagram será implementada na próxima etapa.")}>Conectar Instagram <Icon name="arrow" size={15}/></button><button className="banner-close" aria-label="Fechar aviso" onClick={e => (e.currentTarget.parentElement as HTMLElement).remove()}><Icon name="close" size={16}/></button></section>
              <section className="section-heading"><div><h2>Visão geral</h2><p>Um resumo do que está acontecendo com seu perfil.</p></div><div className="period-select">{["7 dias", "30 dias", "90 dias"].map(value => <button key={value} className={period === value ? "selected" : ""} onClick={() => setPeriod(value)}>{value}</button>)}</div></section>
              <section className="metric-grid">
                <article className="metric-card"><div className="metric-top"><span>Alcance</span><span className="metric-icon mint"><Icon name="eye" size={17}/></span></div><strong>—</strong><div className="metric-foot"><span className="muted-pill">Aguardando conexão</span><small>Últimos {period.toLowerCase()}</small></div></article>
                <article className="metric-card"><div className="metric-top"><span>Engajamento</span><span className="metric-icon peach"><Icon name="heart" size={17}/></span></div><strong>—</strong><div className="metric-foot"><span className="muted-pill">Aguardando conexão</span><small>Taxa de interação</small></div></article>
                <article className="metric-card"><div className="metric-top"><span>Novos seguidores</span><span className="metric-icon lilac"><Icon name="chart" size={17}/></span></div><strong>—</strong><div className="metric-foot"><span className="muted-pill">Aguardando conexão</span><small>Crescimento do perfil</small></div></article>
                <article className="metric-card"><div className="metric-top"><span>Publicações</span><span className="metric-icon gold"><Icon name="layers" size={17}/></span></div><strong>03</strong><div className="metric-foot"><span className="positive-pill">1 publicado</span><small> neste período</small></div></article>
              </section>

              <section className="dashboard-grid">
                <div className="panel performance-panel"><div className="panel-heading"><div><h3>Desempenho</h3><p>Alcance e interações ao longo do tempo</p></div><button className="subtle-button" onClick={() => selectPage("analytics")}>Ver análises <Icon name="arrow" size={14}/></button></div><div className="chart-empty"><div className="chart-illustration"><div className="chart-line"><span/><span/><span/><span/><span/><span/><span/></div><div className="chart-axis"><i/><i/><i/><i/></div></div><strong>Seus dados vão aparecer aqui</strong><span>Conecte seu Instagram para visualizar o desempenho do perfil.</span></div></div>
                <div className="panel upcoming-panel"><div className="panel-heading"><div><h3>Próximas publicações</h3><p>O que vem pela frente</p></div><button className="round-link" onClick={() => selectPage("calendar")}><Icon name="arrow" size={15}/></button></div><div className="upcoming-list">{upcoming.map(item => <div className="upcoming-item" key={item.day}><div className="date-tile"><strong>{item.day}</strong><span>{item.month}</span></div><div className="upcoming-info"><strong>{item.title}</strong><span>{item.type} · {item.time}</span></div><span className={`post-thumb ${item.tone}`}/></div>)}</div><button className="text-link" onClick={() => selectPage("calendar")}>Abrir calendário <Icon name="arrow" size={14}/></button></div>
              </section>

              <section className="panel posts-panel"><div className="panel-heading"><div><h3>Conteúdo recente</h3><p>Acompanhe suas últimas publicações e rascunhos.</p></div><button className="subtle-button" onClick={() => selectPage("content")}>Ver todas <Icon name="arrow" size={14}/></button></div><div className="posts-table"><div className="table-head"><span>PUBLICAÇÃO</span><span>STATUS</span><span>DATA</span><span>CURTIDAS</span><span>ALCANCE</span><span/></div>{filteredPosts.map(post => <div className="post-row" key={post.id}><div className="post-name"><span className={`post-thumb ${post.tone}`}>{post.initials}</span><div><strong>{post.title}</strong><span>{post.type}</span></div></div><div><span className={`status status-${post.status.toLowerCase()}`}><i/>{post.status}</span></div><span className="table-muted">{post.date}</span><span className="table-number">{post.likes}</span><span className="table-number">{post.reach}</span><button className="row-more" aria-label="Mais opções"><Icon name="more"/></button></div>)}{filteredPosts.length === 0 && <div className="no-results">Nenhuma publicação encontrada.</div>}</div></section>
              <footer className="page-footer"><span>© 2026 Zailom Orbit</span><span>Feito para simplificar sua presença digital <span className="footer-star">✳</span></span></footer>
            </> : <section className="coming-page"><div className="eyebrow"><span className="live-dot"/> ZAILOM ORBIT</div><h1>{activeLabel}</h1><p>{active === "calendar" ? "Planeje, organize e programe suas publicações." : active === "content" ? "Crie, organize e acompanhe todo o seu conteúdo." : active === "inbox" ? "Todas as conversas e comentários em um só lugar." : active === "automations" ? "Crie fluxos inteligentes para cuidar das interações." : active === "analytics" ? "Entenda seus resultados e descubra novas oportunidades." : "Gerencie sua conta, integrações e preferências."}</p><div className="coming-card"><div className="coming-icon"><Icon name={active === "calendar" ? "calendar" : active === "content" ? "layers" : active === "inbox" ? "inbox" : active === "automations" ? "zap" : active === "analytics" ? "chart" : "settings"} size={24}/></div><h3>Estamos preparando este espaço</h3><span>Esta área faz parte da estrutura do Orbit e será ativada nas próximas etapas do desenvolvimento.</span><button className="primary-button" onClick={() => selectPage("overview")}>Voltar à visão geral <Icon name="arrow" size={15}/></button></div></section>}
          </div>
        </main>
        {notice && <div className="toast"><span className="toast-dot"/>{notice}<button onClick={() => setNotice("")}><Icon name="close" size={15}/></button></div>}
      </div>
    </>
  );
}

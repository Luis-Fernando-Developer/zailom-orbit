import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  Facebook,
  Heart,
  Instagram,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'

const scheduledPosts = [
  {
    day: '12',
    month: 'NOV',
    title: 'Pequenos hábitos, grandes mudanças',
    channel: 'Instagram · Carrossel',
    time: '10:30',
    thumbnail: 'sage',
  },
  {
    day: '13',
    month: 'NOV',
    title: 'Bastidores da nossa semana',
    channel: 'Facebook · Stories',
    time: '14:00',
    thumbnail: 'clay',
  },
  {
    day: '15',
    month: 'NOV',
    title: 'O guia rápido para começar',
    channel: 'Instagram · Reels',
    time: '18:15',
    thumbnail: 'sand',
  },
]

const recentPosts = [
  {
    title: '5 dicas para sua rotina render mais',
    channel: 'Instagram · Carrossel',
    date: '10 nov, 10:30',
    status: 'Publicado',
    reach: '2.4k',
    interactions: '184',
    thumbnail: 'sage',
  },
  {
    title: 'Novidades chegando por aqui',
    channel: 'Facebook · Post',
    date: '09 nov, 16:00',
    status: 'Publicado',
    reach: '1.8k',
    interactions: '96',
    thumbnail: 'clay',
  },
  {
    title: 'Um pouco dos nossos bastidores',
    channel: 'Instagram · Reels',
    date: '08 nov, 12:15',
    status: 'Rascunho',
    reach: '—',
    interactions: '—',
    thumbnail: 'sand',
  },
]

const metrics = [
  {
    label: 'Alcance total',
    value: '12,8 mil',
    change: '+12,4%',
    icon: Eye,
    tone: 'mint',
  },
  {
    label: 'Interações',
    value: '1.284',
    change: '+8,2%',
    icon: Heart,
    tone: 'peach',
  },
  {
    label: 'Novos seguidores',
    value: '326',
    change: '+5,6%',
    icon: Users,
    tone: 'lilac',
  },
  {
    label: 'Respostas pendentes',
    value: '08',
    change: '3 prioritárias',
    icon: MessageCircle,
    tone: 'gold',
  },
]

const chartBars = [34, 48, 39, 67, 55, 82, 64]

export default function StaticsMain() {
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }

      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('')
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  const filteredPosts = useMemo(
    () =>
      recentPosts.filter((post) =>
        `${post.title} ${post.channel} ${post.status}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch),
      ),
    [normalizedSearch],
  )

  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="main-area w-full min-h-0 flex-1">
      <div className="main-area-container relative flex min-h-0 w-full flex-1 flex-col px-0">
        <header className="topbar sticky w-full top-0 z-10" id="overview">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} aria-hidden="true" />
              <strong>Visão geral</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <span className="sr-only">Buscar publicações</span>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Buscar publicações..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>/</kbd>
            </label>
            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Notificações"
            >
              <Bell size={17} aria-hidden="true" />
              <i aria-hidden="true" />
            </button>
            <div className="top-avatar" aria-label="Perfil de usuário">
              LF
            </div>
          </div>
        </header>

        <main className=" page-content min-h-0 w-full flex-1 p-5
                        gap-1 h-full flex flex-col overflow-y-auto
                        dashboard-scrollbar
                      ">
              <section className="welcome-row ">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot" aria-hidden="true" />
                    SUA CENTRAL DE REDES
                  </div>
                  <h1>Bom dia! <span aria-hidden="true">✦</span></h1>
                  <p className="capitalize">{today} · Aqui está o resumo da sua operação.</p>
                </div>
                <a className="primary-button" href="#page-calendar">
                  <CalendarDays size={15} aria-hidden="true" />
                  Ver agenda
                </a>
              </section>

              <section className="connect-banner" aria-labelledby="connect-title">
                <div className="connect-symbol">
                  <Sparkles size={19} aria-hidden="true" />
                </div>
                <div className="connect-copy">
                  <strong id="connect-title">Conecte suas redes e centralize tudo por aqui</strong>
                  <span>
                    Planeje publicações, acompanhe resultados e responda mensagens em um só lugar.
                  </span>
                </div>
                <a
                  className="connect-action flex shrink-0 items-center gap-2 rounded-md border border-[#94cfa3]/30 bg-[#77b98a]/10 px-3 py-2 text-[10px] font-semibold text-[#bce6c7] no-underline"
                  href="#page-accounts"
                >
                  Conectar uma rede
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </section>

              <section aria-labelledby="metrics-title">
                <div className="section-heading">
                  <div>
                    <h2 id="metrics-title">Visão geral</h2>
                    <p>Números de demonstração para visualizar seu painel.</p>
                  </div>
                  <span className="muted-pill">Últimos 7 dias</span>
                </div>

                <div className="metric-grid">
                  {metrics.map(({ label, value, change, icon: Icon, tone }) => (
                    <article
                      className="metric-card"
                      id={label === 'Respostas pendentes' ? 'inbox' : undefined}
                      key={label}
                    >
                      <div className="metric-top">
                        <span>{label}</span>
                        <span className={`metric-icon ${tone}`}>
                          <Icon size={15} aria-hidden="true" />
                        </span>
                      </div>
                      <strong>{value}</strong>
                      <div className="metric-foot">
                        {label === 'Respostas pendentes' ? (
                          <span className="muted-pill">{change}</span>
                        ) : (
                          <>
                            <span className="positive-pill">{change}</span>
                            <small>vs. semana passada</small>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="dashboard-grid">
                <section className="panel" aria-labelledby="engagement-title">
                  <div className="panel-heading">
                    <div>
                      <h3 id="engagement-title">Alcance e engajamento</h3>
                      <p>Uma prévia de como seus resultados podem aparecer.</p>
                    </div>
                    <span className="subtle-button">
                      Esta semana
                      <ChevronRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                  <div
                    className="chart-empty"
                    role="img"
                    aria-label="Gráfico ilustrativo de alcance dos últimos sete dias"
                  >
                    <div className="chart-illustration">
                      <div className="chart-line">
                        {chartBars.map((height, index) => (
                          <span key={index} style={{ height: `${height}%` }} />
                        ))}
                      </div>
                      <div className="chart-axis" aria-hidden="true">
                        {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => (
                          <small key={day}>{day}</small>
                        ))}
                      </div>
                    </div>
                    <strong>Seus melhores dias estão por vir</strong>
                    <span>Conecte uma conta para acompanhar dados reais de alcance.</span>
                  </div>
                </section>

                <section className="panel upcoming-panel" id="agenda" aria-labelledby="agenda-title">
                  <div className="panel-heading">
                    <div>
                      <h3 id="agenda-title">Próximas publicações</h3>
                      <p>Seu conteúdo que vem por aí.</p>
                    </div>
                    <CalendarDays size={16} color="#9ed5ad" aria-hidden="true" />
                  </div>
                  <div className="upcoming-list">
                    {scheduledPosts.map((post) => (
                      <article className="upcoming-item" key={`${post.day}-${post.title}`}>
                        <div className="date-tile">
                          <strong>{post.day}</strong>
                          <span>{post.month}</span>
                        </div>
                        <div className="upcoming-info">
                          <strong>{post.title}</strong>
                          <span>{post.channel} · {post.time}</span>
                        </div>
                        <div className={`post-thumb ${post.thumbnail}`} aria-hidden="true">
                          {post.channel.includes('Instagram') ? 'IG' : 'FB'}
                        </div>
                      </article>
                    ))}
                  </div>
                  <a className="text-link" href="#page-posts">
                    Ver todas as publicações
                    <ChevronRight size={13} aria-hidden="true" />
                  </a>
                </section>
              </div>

              <div className="dashboard-grid">
                <section className="panel posts-panel" id="postagens" aria-labelledby="posts-title">
                  <div className="panel-heading">
                    <div>
                      <h3 id="posts-title">Publicações recentes</h3>
                      <p>Acompanhe o conteúdo da sua marca.</p>
                    </div>
                    <a className="subtle-button" href="#page-calendar">
                      Ver agenda
                      <ChevronRight size={13} aria-hidden="true" />
                    </a>
                  </div>

                  <div className="posts-table" role="table" aria-label="Publicações recentes">
                    <div className="table-head" role="row">
                      <span role="columnheader">PUBLICAÇÃO</span>
                      <span role="columnheader">STATUS</span>
                      <span role="columnheader">DATA</span>
                      <span role="columnheader">ALCANCE</span>
                      <span role="columnheader">INTERAÇÕES</span>
                      <span aria-hidden="true" />
                    </div>
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => (
                        <div className="post-row" role="row" key={post.title}>
                          <div className="post-name" role="cell">
                            <div className={`post-thumb ${post.thumbnail}`} aria-hidden="true">
                              {post.channel.includes('Instagram') ? 'IG' : 'FB'}
                            </div>
                            <div>
                              <strong>{post.title}</strong>
                              <span>{post.channel}</span>
                            </div>
                          </div>
                          <span className={`status status-${post.status === 'Publicado' ? 'publicado' : 'rascunho'}`} role="cell">
                            <i aria-hidden="true" />
                            {post.status}
                          </span>
                          <span className="table-muted" role="cell">{post.date}</span>
                          <span className="table-number" role="cell">{post.reach}</span>
                          <span className="table-number" role="cell">{post.interactions}</span>
                          <span className="row-more" role="cell" aria-hidden="true">···</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-results" role="status">
                        Nenhuma publicação encontrada para “{search}”.
                      </p>
                    )}
                  </div>
                  <p className="table-muted demo-note">
                    As publicações e métricas acima são apenas exemplos.
                  </p>
                </section>

                <div className="flex flex-col gap-3">
                  <section className="panel" id="automations" aria-labelledby="automation-title">
                    <div className="panel-heading">
                      <div>
                        <h3 id="automation-title">Automações</h3>
                        <p>Ganhe tempo nas conversas.</p>
                      </div>
                      <Sparkles size={16} color="#9ed5ad" aria-hidden="true" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="metric-icon mint shrink-0">
                          <MessageCircle size={14} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-[10px] text-[#c6d6cb]">Respostas rápidas</strong>
                          <span className="mt-1 block text-[9px] text-[#7f9588]">
                            Sugestões para perguntas frequentes.
                          </span>
                        </div>
                        <span className="positive-pill">Ideia</span>
                      </div>
                      <div className="flex items-start gap-3 border-t border-white/5 pt-3">
                        <span className="metric-icon gold shrink-0">
                          <Clock3 size={14} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-[10px] text-[#c6d6cb]">Fila inteligente</strong>
                          <span className="mt-1 block text-[9px] text-[#7f9588]">
                            Organize comentários e mensagens.
                          </span>
                        </div>
                        <span className="positive-pill">Ideia</span>
                      </div>
                    </div>
                  </section>

                  <section className="panel" id="contas" aria-labelledby="accounts-title">
                    <div className="panel-heading">
                      <div>
                        <h3 id="accounts-title">Suas redes</h3>
                        <p>Comece conectando uma conta.</p>
                      </div>
                      <Plus size={16} color="#9ed5ad" aria-hidden="true" />
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3">
                        <Instagram size={17} color="#c6a4dd" aria-hidden="true" />
                        <span className="flex-1 text-[10px] text-[#c6d6cb]">Instagram</span>
                        <span className="text-[9px] text-[#82988d]">Não conectado</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3">
                        <Facebook size={17} color="#83a9e7" aria-hidden="true" />
                        <span className="flex-1 text-[10px] text-[#c6d6cb]">Facebook</span>
                        <span className="text-[9px] text-[#82988d]">Não conectado</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3">
                        <Send size={17} color="#82c7d9" aria-hidden="true" />
                        <span className="flex-1 text-[10px] text-[#c6d6cb]">TikTok e outras redes</span>
                        <Plus size={14} color="#82988d" aria-hidden="true" />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <footer className="page-footer">
                <span>Visão geral da sua presença digital</span>
                <span>Feito para criar com consistência <span className="footer-star">✦</span></span>
              </footer>
        </main>
      </div>
    </div>
  )
}

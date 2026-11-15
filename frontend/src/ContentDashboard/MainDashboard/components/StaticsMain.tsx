import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  Instagram,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import { getPosts, type ApiPost } from '@/lib/api'

const platformLabels: Record<ApiPost['platform'], string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Outra rede',
}

const formatLabels: Record<ApiPost['format'], string> = {
  POST: 'Post',
  STORY: 'Stories',
  REEL: 'Reels',
  VIDEO: 'Vídeo',
  CAROUSEL: 'Carrossel',
  SHORT: 'Shorts',
  OTHER: 'Outro formato',
}

const statusLabels: Record<ApiPost['status'], string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
}

function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function postChannel(post: ApiPost): string {
  return `${platformLabels[post.platform]} · ${formatLabels[post.format]}`
}

function postTimestamp(post: ApiPost): number {
  return new Date(post.updatedAt || post.createdAt).getTime()
}

export default function StaticsMain() {
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')
    try {
      const result = await getPosts()
      setPosts(result)
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Não foi possível carregar os dados do dashboard.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const now = Date.now()
  const scheduled = useMemo(
    () => posts
      .filter((post) => post.status === 'SCHEDULED' && post.scheduledAt && new Date(post.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()),
    [posts, now],
  )

  const recent = useMemo(
    () => [...posts].sort((a, b) => postTimestamp(b) - postTimestamp(a)),
    [posts],
  )

  const activities = useMemo(() => recent.slice(0, 5), [recent])
  const publishedCount = posts.filter((post) => post.status === 'PUBLISHED').length
  const draftCount = posts.filter((post) => post.status === 'DRAFT').length
  const scheduledCount = posts.filter((post) => post.status === 'SCHEDULED').length
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const visibleRecent = recent.filter((post) =>
    `${post.title} ${postChannel(post)} ${statusLabels[post.status]}`
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch),
  )

  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="main-area w-full min-h-0 flex-1">
      <div className="main-area-container relative flex min-h-0 w-full flex-1 flex-col px-0">
        <header className="topbar sticky w-full top-0 z-10">
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
                type="search"
                placeholder="Buscar publicações..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              className="icon-button"
              type="button"
              aria-label="Atualizar dashboard"
              onClick={() => void loadDashboard(true)}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <a className="icon-button notification-button" href="#page-inbox" aria-label="Abrir caixa de entrada">
              <Bell size={17} aria-hidden="true" />
            </a>
            <div className="top-avatar" aria-label="Perfil de usuário">LF</div>
          </div>
        </header>

        <main className="page-content min-h-0 w-full flex-1 p-5 gap-1 h-full flex flex-col overflow-y-auto dashboard-scrollbar">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="live-dot" aria-hidden="true" />
                SUA CENTRAL DE REDES
              </div>
              <h1>Bom dia! <span aria-hidden="true">✦</span></h1>
              <p className="capitalize">{today} · Resumo atualizado do seu workspace.</p>
            </div>
            <a className="primary-button" href="#page-calendar">
              <CalendarDays size={15} aria-hidden="true" />
              Ver agenda
            </a>
          </section>

          <section className="connect-banner" aria-labelledby="connect-title">
            <div className="connect-symbol"><Sparkles size={19} aria-hidden="true" /></div>
            <div className="connect-copy">
              <strong id="connect-title">Conecte suas redes para acompanhar o desempenho</strong>
              <span>Suas publicações já são organizadas aqui. Métricas sociais chegam com as integrações oficiais.</span>
            </div>
            <a className="connect-action flex shrink-0 items-center gap-2 rounded-md border border-[#94cfa3]/30 bg-[#77b98a]/10 px-3 py-2 text-[10px] font-semibold text-[#bce6c7] no-underline" href="#page-accounts">
              Conectar uma rede <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </section>

          {error && (
            <section className="glass-note mb-3" role="alert">
              <span>{error}</span>
              <button className="glass-button ml-auto" type="button" onClick={() => void loadDashboard(true)}>
                <RefreshCw size={13} /> Tentar novamente
              </button>
            </section>
          )}

          <section aria-labelledby="metrics-title">
            <div className="section-heading">
              <div>
                <h2 id="metrics-title">Visão geral</h2>
                <p>Indicadores calculados a partir das publicações salvas no seu workspace.</p>
              </div>
              <span className="muted-pill">Dados do workspace</span>
            </div>
            <div className="metric-grid">
              {[
                { label: 'Total de publicações', value: posts.length, icon: FileText, tone: 'mint' },
                { label: 'Agendadas', value: scheduledCount, icon: Clock3, tone: 'gold' },
                { label: 'Publicadas', value: publishedCount, icon: CheckCircle2, tone: 'peach' },
                { label: 'Rascunhos', value: draftCount, icon: Users, tone: 'lilac' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <article className="metric-card" key={label}>
                  <div className="metric-top">
                    <span>{label}</span>
                    <span className={`metric-icon ${tone}`}><Icon size={15} aria-hidden="true" /></span>
                  </div>
                  <strong>{isLoading ? '—' : value.toLocaleString('pt-BR')}</strong>
                  <div className="metric-foot"><small>{isLoading ? 'Carregando dados...' : 'Atualizado agora'}</small></div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel posts-panel" aria-labelledby="posts-title">
            <div className="panel-heading">
              <div>
                <h3 id="posts-title">Publicações recentes</h3>
                <p>Conteúdo real cadastrado no seu workspace.</p>
              </div>
              <a className="subtle-button" href="#page-posts">Ver todas <ChevronRight size={13} /></a>
            </div>
            <div className="posts-table" role="table" aria-label="Publicações recentes">
              <div className="table-head" role="row">
                <span role="columnheader">PUBLICAÇÃO</span>
                <span role="columnheader">STATUS</span>
                <span role="columnheader">ATUALIZADA</span>
                <span role="columnheader">REDE</span>
                <span aria-hidden="true" />
              </div>
              {isLoading ? (
                <p className="empty-state">Carregando publicações...</p>
              ) : visibleRecent.length ? visibleRecent.slice(0, 6).map((post) => (
                <div className="post-row" role="row" key={post.id}>
                  <div className="post-name" role="cell">
                    <div className="post-thumb sage" aria-hidden="true">{post.platform === 'INSTAGRAM' ? 'IG' : post.platform.slice(0, 2)}</div>
                    <div><strong>{post.title}</strong><span>{formatLabels[post.format]}</span></div>
                  </div>
                  <span className={`status status-${post.status === 'PUBLISHED' ? 'publicado' : post.status === 'SCHEDULED' ? 'agendado' : 'rascunho'}`} role="cell">
                    <i aria-hidden="true" />{statusLabels[post.status]}
                  </span>
                  <span className="table-muted" role="cell">{formatDate(post.updatedAt, '—')}</span>
                  <span className="table-muted" role="cell">{platformLabels[post.platform]}</span>
                  <span className="row-more" role="cell" aria-hidden="true">···</span>
                </div>
              )) : (
                <p className="no-results" role="status">
                  {posts.length ? `Nenhuma publicação encontrada para “${search}”.` : 'Nenhuma publicação cadastrada ainda. Crie a primeira para ver seus dados aqui.'}
                </p>
              )}
            </div>
            <p className="table-muted demo-note">Alcance, curtidas e engajamento serão exibidos quando as contas sociais estiverem conectadas.</p>
          </section>

          <div className="dashboard-grid">
            <section className="panel" aria-labelledby="activity-title">
              <div className="panel-heading">
                <div>
                  <h3 id="activity-title">Atividade recente</h3>
                  <p>Últimas alterações nas suas publicações.</p>
                </div>
                <FileText size={16} color="#9ed5ad" aria-hidden="true" />
              </div>
              <div className="upcoming-list">
                {isLoading ? (
                  <p className="empty-state">Carregando atividades...</p>
                ) : activities.length ? activities.map((post) => (
                  <article className="upcoming-item" key={post.id}>
                    <div className="metric-icon mint"><FileText size={15} /></div>
                    <div className="upcoming-info">
                      <strong>{post.title}</strong>
                      <span>{postChannel(post)} · {formatDate(post.updatedAt, 'Data indisponível')}</span>
                    </div>
                    <span className={`status status-${post.status === 'PUBLISHED' ? 'publicado' : post.status === 'SCHEDULED' ? 'agendado' : 'rascunho'}`}>
                      {statusLabels[post.status]}
                    </span>
                  </article>
                )) : (
                  <p className="empty-state">Ainda não há atividades. Crie sua primeira publicação para começar.</p>
                )}
              </div>
              <a className="text-link" href="#page-posts">Abrir publicações <ChevronRight size={13} /></a>
            </section>

            <section className="panel upcoming-panel" aria-labelledby="agenda-title">
              <div className="panel-heading">
                <div>
                  <h3 id="agenda-title">Próximas publicações</h3>
                  <p>Conteúdos agendados para os próximos dias.</p>
                </div>
                <CalendarDays size={16} color="#9ed5ad" aria-hidden="true" />
              </div>
              <div className="upcoming-list">
                {isLoading ? (
                  <p className="empty-state">Carregando agenda...</p>
                ) : scheduled.length ? scheduled.slice(0, 5).map((post) => (
                  <article className="upcoming-item" key={post.id}>
                    <div className="date-tile">
                      <strong>{new Date(post.scheduledAt!).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong>
                      <span>{new Date(post.scheduledAt!).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                    </div>
                    <div className="upcoming-info">
                      <strong>{post.title}</strong>
                      <span>{postChannel(post)} · {formatDate(post.scheduledAt, '')}</span>
                    </div>
                  </article>
                )) : (
                  <p className="empty-state">Nenhuma publicação agendada. Organize seu próximo conteúdo no calendário.</p>
                )}
              </div>
              <a className="text-link" href="#page-calendar">Ver calendário <ChevronRight size={13} /></a>
            </section>
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div><h3>Desempenho social</h3><p>Métricas oficiais das plataformas.</p></div>
                <Heart size={16} color="#9ed5ad" />
              </div>
              <div className="chart-empty">
                <div className="chart-illustration"><Instagram size={28} /></div>
                <strong>Conecte uma conta para liberar métricas</strong>
                <span>Alcance, interações e crescimento não são estimados nem simulados.</span>
                <a className="text-link" href="#page-accounts">Conectar redes <ChevronRight size={13} /></a>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div><h3>Central de organização</h3><p>Continue seu planejamento.</p></div>
                <Sparkles size={16} color="#9ed5ad" />
              </div>
              <div className="upcoming-list">
                <a className="upcoming-item no-underline" href="#page-posts">
                  <span className="metric-icon mint"><FileText size={15} /></span>
                  <span className="upcoming-info"><strong>Gerenciar publicações</strong><span>Editar rascunhos e conteúdos agendados</span></span>
                  <ChevronRight size={15} />
                </a>
                <a className="upcoming-item no-underline" href="#page-accounts">
                  <span className="metric-icon gold"><Instagram size={15} /></span>
                  <span className="upcoming-info"><strong>Conectar canais</strong><span>Preparar as integrações oficiais</span></span>
                  <ChevronRight size={15} />
                </a>
                <a className="upcoming-item no-underline" href="#page-inbox">
                  <span className="metric-icon lilac"><MessageCircle size={15} /></span>
                  <span className="upcoming-info"><strong>Caixa de entrada</strong><span>Centralizar conversas quando disponível</span></span>
                  <ChevronRight size={15} />
                </a>
              </div>
            </section>
          </div>

          <footer className="page-footer">
            <span>Dados de conteúdo consultados diretamente do seu workspace</span>
            <span>Feito para criar com consistência <span className="footer-star">✦</span></span>
          </footer>
        </main>
      </div>
    </div>
  )
}

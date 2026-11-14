import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Facebook,
  FileImage,
  Filter,
  Heart,
  ImagePlus,
  Instagram,
  Link2,
  Mail,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  UsersRound,
  Youtube,
} from 'lucide-react'
import { createPost, deletePost, getPosts, type ApiPost } from '@/lib/api'

export type WorkspacePage =
  | 'overview'
  | 'calendar'
  | 'posts'
  | 'inbox'
  | 'automations'
  | 'analytics'
  | 'marketing'
  | 'accounts'
  | 'library'
  | 'team'
  | 'settings'

interface PageMeta {
  title: string
  description: string
}

const pageMeta: Record<Exclude<WorkspacePage, 'overview'>, PageMeta> = {
  calendar: {
    title: 'Calendário de conteúdo',
    description: 'Organize o que vai ao ar e mantenha sua presença ativa.',
  },
  posts: {
    title: 'Publicações',
    description: 'Crie, revise e acompanhe o conteúdo de todos os seus canais.',
  },
  inbox: {
    title: 'Caixa de entrada',
    description: 'Comentários e mensagens reunidos em um único lugar.',
  },
  automations: {
    title: 'Automações',
    description: 'Prepare fluxos para responder, organizar e ganhar tempo.',
  },
  analytics: {
    title: 'Análises',
    description: 'Entenda o desempenho do conteúdo e da sua comunidade.',
  },
  marketing: {
    title: 'Marketing',
    description: 'Planeje campanhas pagas para alcançar novas pessoas.',
  },
  accounts: {
    title: 'Redes conectadas',
    description: 'Gerencie os canais que fazem parte do seu workspace.',
  },
  library: {
    title: 'Biblioteca de conteúdo',
    description: 'Mantenha imagens, vídeos e ideias organizados para reutilizar.',
  },
  team: {
    title: 'Equipe e permissões',
    description: 'Convide pessoas e organize o trabalho do seu time.',
  },
  settings: {
    title: 'Configurações',
    description: 'Personalize seu workspace, notificações e preferências.',
  },
}

interface PageFrameProps {
  page: Exclude<WorkspacePage, 'overview'>
  children: ReactNode
}

function PageFrame({ page, children }: PageFrameProps) {
  const { title, description } = pageMeta[page]
  const footerMessage = page === 'calendar' || page === 'posts'
    ? 'Os dados desta página são salvos no seu workspace.'
    : page === 'marketing'
      ? 'Os rascunhos são temporários e não são enviados às plataformas.'
      : 'Os exemplos desta tela ainda não estão conectados a uma API.'

  return (
    <div className="main-area min-w-0 min-h-0 flex-1">
      <header className="topbar sticky top-0 z-10">
        <div className="breadcrumb">
          <a href="#page-overview">Workspace</a>
          <ChevronRight size={13} aria-hidden="true" />
          <strong>{title}</strong>
        </div>
        <div className="topbar-actions">
          <a className="icon-button notification-button" href="#page-inbox" aria-label="Abrir caixa de entrada">
            <Bell size={17} aria-hidden="true" />
            <i aria-hidden="true" />
          </a>
          <div className="top-avatar" aria-label="Perfil de usuário">LF</div>
        </div>
      </header>
      <main className="page-content dashboard-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="live-dot" aria-hidden="true" />
              ORBIT · WORKSPACE
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <span className="demo-badge"><Sparkles size={13} /> Prévia do produto</span>
        </section>
        {children}
        <footer className="page-footer">
          <span>{footerMessage}</span>
          <a href="#page-overview">Voltar à visão geral <ChevronRight size={12} /></a>
        </footer>
      </main>
    </div>
  )
}

function SectionHeading({ title, description, action }: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function GlassButton({ children, onClick, type = 'button', disabled = false }: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button className="glass-button" type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

const platformLabels = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Outra rede',
} as const

const formatLabels = {
  POST: 'Post',
  STORY: 'Stories',
  REEL: 'Reels',
  VIDEO: 'Vídeo',
  CAROUSEL: 'Carrossel',
  SHORT: 'Shorts',
  OTHER: 'Outro formato',
} as const

const statusLabels = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
} as const

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function defaultScheduleTime(date: Date): string {
  const now = new Date()
  if (localDateKey(date) !== localDateKey(now) || now.getHours() >= 22) return '12:00'
  return `${String(now.getHours() + 1).padStart(2, '0')}:00`
}

function postChannel(post: ApiPost): string {
  return `${platformLabels[post.platform]} · ${formatLabels[post.format]}`
}

function postDate(post: ApiPost): string {
  if (post.scheduledAt) {
    return new Date(post.scheduledAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return post.status === 'PUBLISHED'
    ? new Date(post.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short' })
    : 'Sem data'
}

function calendarWeekStart(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

function calendarAddDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function CalendarPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [scheduleTime, setScheduleTime] = useState(() => defaultScheduleTime(new Date()))
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const range = useMemo(() => {
    if (view === 'day') {
      const start = new Date(selectedDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    if (view === 'week') {
      const start = calendarWeekStart(selectedDate)
      const end = calendarAddDays(start, 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const start = calendarWeekStart(first)
    const end = calendarAddDays(start, 41)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [selectedDate, view])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError('')
    getPosts({ from: range.start.toISOString(), to: range.end.toISOString() })
      .then((result) => { if (active) setPosts(result) })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o calendário.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [range])

  const days = useMemo(
    () => Array.from({ length: view === 'day' ? 1 : view === 'week' ? 7 : 42 }, (_, index) => calendarAddDays(range.start, index)),
    [range, view],
  )
  const postsForDay = (date: Date) => posts
    .filter((post) => post.scheduledAt && localDateKey(new Date(post.scheduledAt)) === localDateKey(date))
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime())
  const selectedPosts = postsForDay(selectedDate)
  const titleDate = view === 'month'
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(selectedDate)
    : view === 'day'
      ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)
      : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(days[0]) + ' — ' +
        new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(days[6])

  function navigate(direction: number) {
    const next = new Date(selectedDate)
    if (view === 'day') next.setDate(next.getDate() + direction)
    else if (view === 'week') next.setDate(next.getDate() + direction * 7)
    else next.setMonth(next.getMonth() + direction)
    setSelectedDate(next)
    setScheduleTime(defaultScheduleTime(next))
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setIsSaving(true)
    setError('')
    const scheduledAt = new Date(selectedDate)
    const [hours, minutes] = scheduleTime.split(':').map(Number)
    scheduledAt.setHours(hours, minutes, 0, 0)
    try {
      const created = await createPost({
        title: title.trim(),
        caption: '',
        platform: 'INSTAGRAM',
        format: 'POST',
        status: 'SCHEDULED',
        scheduledAt: scheduledAt.toISOString(),
      })
      setPosts((current) => [...current, created])
      setTitle('')
      setShowForm(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível agendar a publicação.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageFrame page="calendar">
      <section className="panel mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GlassButton onClick={() => navigate(-1)}><ChevronLeft size={15} /> Anterior</GlassButton>
          <GlassButton onClick={() => setSelectedDate(new Date())}>Hoje</GlassButton>
          <GlassButton onClick={() => navigate(1)}>Próximo <ChevronRight size={15} /></GlassButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold capitalize">{titleDate}</h2>
          <div className="filter-tabs" role="tablist" aria-label="Visualização do calendário">
            {([['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']] as const).map(([value, label]) => (
              <button aria-selected={view === value} className={view === value ? 'selected' : ''} key={value} onClick={() => setView(value)} role="tab" type="button">{label}</button>
            ))}
          </div>
          <GlassButton onClick={() => setShowForm((value) => !value)}><Plus size={14} /> Nova publicação</GlassButton>
        </div>
      </section>

      {showForm && (
        <form className="panel inline-form mb-4" onSubmit={addEvent}>
          <label>Título da publicação<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Dica da semana" /></label>
          <label>Data<input type="date" required value={localDateKey(selectedDate)} onChange={(event) => {
            if (event.target.value) {
              const parts = event.target.value.split('-').map(Number)
              setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]))
            }
          }} /></label>
          <label>Horário<input required type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /></label>
          <button className="glass-button" disabled={isSaving} type="submit"><Check size={14} /> {isSaving ? 'Salvando...' : 'Agendar publicação'}</button>
        </form>
      )}
      {error && <p className="inline-notice mb-3" role="alert">{error}</p>}

      {view === 'month' ? (
        <section className="panel">
          <div className="grid grid-cols-7 border-b border-white/10 pb-2 text-center text-xs font-medium uppercase tracking-wide opacity-60">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const dayPosts = postsForDay(date)
              const inMonth = date.getMonth() === selectedDate.getMonth()
              const today = localDateKey(date) === localDateKey(new Date())
              return (
                <button className={'min-h-24 rounded-xl border p-2 text-left transition hover:bg-white/5 sm:min-h-28 ' + (inMonth ? 'border-white/10' : 'border-transparent opacity-35') + (today ? ' ring-1 ring-emerald-400/60' : '')} key={localDateKey(date)} onClick={() => { setSelectedDate(date); setView('day') }} type="button">
                  <span className={'text-xs font-semibold ' + (today ? 'text-emerald-300' : '')}>{date.getDate()}</span>
                  <span className="mt-2 flex flex-col gap-1">
                    {dayPosts.slice(0, 2).map((post) => <span className="truncate rounded-md bg-emerald-400/10 px-1.5 py-1 text-[10px] text-emerald-100" key={post.id}>{post.title}</span>)}
                    {dayPosts.length > 2 && <span className="text-[10px] opacity-60">+{dayPosts.length - 2} publicações</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {isLoading && <p className="empty-state mt-3">Carregando publicações...</p>}
          {!isLoading && posts.length === 0 && <p className="empty-state mt-3">Nenhuma publicação neste período.</p>}
        </section>
      ) : view === 'week' ? (
        <section className="panel">
          <div className="grid grid-cols-7 gap-2">
            {days.map((date) => {
              const dayPosts = postsForDay(date)
              const selected = localDateKey(date) === localDateKey(selectedDate)
              const today = localDateKey(date) === localDateKey(new Date())
              return (
                <button className={'min-h-36 rounded-xl border p-2 text-left transition hover:bg-white/5 sm:min-h-52 ' + (selected ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-white/10')} key={localDateKey(date)} onClick={() => setSelectedDate(date)} type="button">
                  <span className="flex flex-col gap-1 border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase opacity-60">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')}</span>
                    <strong className={today ? 'text-emerald-300' : ''}>{date.getDate()}</strong>
                  </span>
                  <span className="mt-2 flex flex-col gap-1">
                    {dayPosts.slice(0, 3).map((post) => <span className="truncate rounded-md bg-emerald-400/10 px-1.5 py-1 text-[10px] text-emerald-100" key={post.id}>{post.title}</span>)}
                    {dayPosts.length > 3 && <span className="text-[10px] opacity-60">+{dayPosts.length - 3}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {isLoading && <p className="empty-state mt-3">Carregando publicações...</p>}
        </section>
      ) : (
        <div className="dashboard-grid page-grid-spaced">
          <section className="panel">
            <SectionHeading title={titleDate} description="Publicações programadas para este dia." action={<GlassButton onClick={() => setShowForm(true)}><Plus size={14} /> Agendar</GlassButton>} />
            <div className="timeline-list">
              {isLoading && <p className="empty-state">Carregando publicações...</p>}
              {!isLoading && selectedPosts.map((post) => (
                <article className="timeline-item" key={post.id}>
                  <time>{post.scheduledAt && new Date(post.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                  <span className="timeline-marker" aria-hidden="true" />
                  <div className="glass-row flex-1">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="metric-icon mint"><ImagePlus size={15} /></span>
                      <div className="min-w-0"><strong>{post.title}</strong><span>{postChannel(post)}</span></div>
                    </div>
                    <span className={'status status-' + statusLabels[post.status].toLocaleLowerCase('pt-BR')}>{statusLabels[post.status]}</span>
                  </div>
                </article>
              ))}
              {!isLoading && selectedPosts.length === 0 && <p className="empty-state">Nenhuma publicação planejada para este dia.</p>}
            </div>
          </section>
          <section className="panel">
            <SectionHeading title="Resumo do dia" description="Visão rápida do planejamento." />
            <div className="schedule-summary">
              <div><strong>{selectedPosts.length}</strong><span>publicações no dia</span></div>
              <div><strong>{new Set(selectedPosts.map((post) => post.platform)).size}</strong><span>canais planejados</span></div>
              <div><strong>{selectedPosts.filter((post) => post.status === 'PUBLISHED').length}</strong><span>já publicadas</span></div>
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  )
}
function PostsPage() {
  const [filter, setFilter] = useState('Todas')
  const [showForm, setShowForm] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadPosts() {
    setError('')
    try {
      setPosts(await getPosts())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as publicações.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  const visiblePosts = filter === 'Todas'
    ? posts
    : posts.filter((post) => statusLabels[post.status] === filter)

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draftTitle.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const created = await createPost({
        title: draftTitle.trim(),
        caption: '',
        platform: 'INSTAGRAM',
        format: 'POST',
        status: 'DRAFT',
        scheduledAt: null,
      })
      setPosts((current) => [created, ...current])
      setDraftTitle('')
      setShowForm(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o rascunho.')
    } finally {
      setIsSaving(false)
    }
  }

  async function removePost(post: ApiPost) {
    if (!window.confirm(`Excluir a publicação "${post.title}"? Esta ação não pode ser desfeita.`)) return
    setError('')
    try {
      await deletePost(post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível excluir a publicação.')
    }
  }

  return (
    <PageFrame page="posts">
      <SectionHeading
        title="Todas as publicações"
        description={`${posts.length} conteúdos no seu workspace.`}
        action={<GlassButton onClick={() => setShowForm((value) => !value)}><Plus size={14} /> Criar publicação</GlassButton>}
      />
      {showForm && (
        <form className="panel inline-form mb-4" onSubmit={createDraft}>
          <label>
            Comece com uma ideia
            <input autoFocus required value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Escreva um título para o rascunho..." />
          </label>
          <button className="glass-button" disabled={isSaving} type="submit">
            <Check size={14} /> {isSaving ? 'Salvando...' : 'Criar rascunho'}
          </button>
        </form>
      )}
      {error && <p className="inline-notice" role="alert">{error}</p>}
      <section className="panel posts-panel">
        <div className="filter-row">
          <div className="filter-tabs" role="tablist" aria-label="Filtrar publicações">
            {['Todas', 'Rascunho', 'Agendado', 'Publicado'].map((option) => (
              <button
                aria-selected={filter === option}
                className={filter === option ? 'selected' : ''}
                key={option}
                onClick={() => setFilter(option)}
                role="tab"
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          <GlassButton disabled><Filter size={14} /> Mais filtros</GlassButton>
        </div>
        <div className="content-list">
          {isLoading && <p className="empty-state">Carregando publicações...</p>}
          {visiblePosts.map((post) => (
            <article className="glass-row" key={post.id}>
              <div className="post-thumb sage"><ImagePlus size={17} /></div>
              <div className="min-w-0 flex-1">
                <strong>{post.title}</strong>
                <span>{postChannel(post)}</span>
              </div>
              <span className={`status status-${statusLabels[post.status].toLocaleLowerCase('pt-BR')}`}>{statusLabels[post.status]}</span>
              <span className="table-muted">{postDate(post)}</span>
              <button
                className="glass-icon-button"
                onClick={() => void removePost(post)}
                type="button"
                aria-label={`Excluir ${post.title}`}
              ><Trash2 size={15} /></button>
            </article>
          ))}
          {!isLoading && visiblePosts.length === 0 && <p className="empty-state">Nenhuma publicação nesta categoria.</p>}
        </div>
      </section>
    </PageFrame>
  )
}

interface Conversation {
  id: number
  name: string
  handle: string
  network: string
  message: string
  time: string
  unread: boolean
  replies: string[]
}

function InboxPage() {
  const [selectedId, setSelectedId] = useState(1)
  const [filter, setFilter] = useState<'Todas' | 'Não lidas'>('Todas')
  const [conversationQuery, setConversationQuery] = useState('')
  const [reply, setReply] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 1, name: 'Mariana Costa', handle: '@mariana.costa', network: 'Instagram', message: 'Oi! Vocês entregam para todo o Brasil?', time: '2 min', unread: true, replies: [] },
    { id: 2, name: 'Rafael Lima', handle: '@rafael.lima', network: 'Facebook', message: 'Adorei o post de hoje! 👏', time: '18 min', unread: true, replies: [] },
    { id: 3, name: 'Ana Beatriz', handle: '@anabeatriz', network: 'Instagram', message: 'Qual o horário de atendimento?', time: '1 h', unread: false, replies: [] },
  ])
  const visibleConversations = conversations.filter((conversation) => {
    const matchesFilter = filter === 'Todas' || conversation.unread
    const matchesQuery = `${conversation.name} ${conversation.handle} ${conversation.message}`
      .toLocaleLowerCase('pt-BR')
      .includes(conversationQuery.toLocaleLowerCase('pt-BR'))
    return matchesFilter && matchesQuery
  })
  const selected = visibleConversations.find((conversation) => conversation.id === selectedId) ?? visibleConversations[0]

  function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || !selected) return
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? { ...conversation, unread: false, replies: [...conversation.replies, reply.trim()] }
          : conversation,
      ),
    )
    setReply('')
  }

  return (
    <PageFrame page="inbox">
      <section className="panel inbox-panel">
        <aside className="inbox-list">
          <div className="inbox-toolbar">
            <div className="filter-tabs">
              {(['Todas', 'Não lidas'] as const).map((option) => (
                <button className={filter === option ? 'selected' : ''} key={option} onClick={() => setFilter(option)} type="button">{option}</button>
              ))}
            </div>
            <label className="inbox-search">
              <Search size={14} aria-hidden="true" />
              <input aria-label="Buscar conversas" value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} />
            </label>
          </div>
          {visibleConversations.map((conversation) => (
            <button
              className={`conversation-item ${selected?.id === conversation.id ? 'selected' : ''}`}
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              type="button"
            >
              <span className="conversation-avatar">{conversation.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
              <span className="min-w-0 flex-1">
                <strong>{conversation.name}</strong>
                <span>{conversation.message}</span>
              </span>
              <small>{conversation.time}</small>
              {conversation.unread && <i className="unread-dot" />}
            </button>
          ))}
        </aside>
        <section className="conversation-detail" aria-label="Conversa selecionada">
          {selected ? (
            <>
              <header className="conversation-header">
                <span className="conversation-avatar">{selected.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <div className="min-w-0 flex-1">
                  <strong>{selected.name}</strong>
                  <span>{selected.handle} · {selected.network}</span>
                </div>
                <button className="glass-icon-button" type="button" aria-label="Marcar conversa como lida" onClick={() => setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, unread: false } : item))}><CheckCheck size={16} /></button>
                <button className="glass-icon-button" type="button" aria-label="Mais opções"><MoreHorizontal size={17} /></button>
              </header>
              <div className="message-thread">
                <span className="thread-date">HOJE · {selected.time}</span>
                <div className="message-bubble incoming">{selected.message}</div>
                {selected.replies.map((message, index) => <div className="message-bubble outgoing" key={`${index}-${message}`}>{message}</div>)}
              </div>
              <form className="reply-box" onSubmit={sendReply}>
                <input aria-label="Escreva uma resposta" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escreva sua resposta..." />
                <button className="send-button" type="submit" aria-label="Enviar resposta"><Send size={16} /></button>
              </form>
              <p className="integration-note">Resposta de demonstração — o envio real será habilitado após integrar a rede.</p>
            </>
          ) : <p className="empty-state">Nenhuma conversa para mostrar.</p>}
        </section>
      </section>
    </PageFrame>
  )
}

interface Automation {
  id: number
  title: string
  description: string
  trigger: string
  enabled: boolean
}

function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([
    { id: 1, title: 'Boas-vindas para novos seguidores', description: 'Agradeça quem começou a seguir sua marca.', trigger: 'Novo seguidor', enabled: false },
    { id: 2, title: 'Resposta para perguntas frequentes', description: 'Sugira uma resposta quando alguém perguntar sobre horário ou entrega.', trigger: 'Palavra-chave', enabled: false },
    { id: 3, title: 'Organizar comentários importantes', description: 'Marque mensagens que precisam de atenção da equipe.', trigger: 'Comentário recebido', enabled: false },
  ])

  return (
    <PageFrame page="automations">
      <div className="glass-note mb-5"><Sparkles size={17} /><span>As automações estão em modo de prévia e não enviam mensagens. Conecte as redes e configure regras antes de ativá-las em produção.</span></div>
      <SectionHeading title="Modelos para começar" description="Ative apenas depois de revisar o comportamento de cada regra." action={<span className="muted-pill">3 modelos</span>} />
      <div className="automation-grid">
        {automations.map((automation) => (
          <article className="panel automation-card" key={automation.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="metric-icon mint"><Sparkles size={16} /></span>
              <button
                aria-checked={automation.enabled}
                aria-label={`${automation.enabled ? 'Desativar' : 'Ativar'} ${automation.title}`}
                className={`switch-control ${automation.enabled ? 'on' : ''}`}
                onClick={() => setAutomations((current) => current.map((item) => item.id === automation.id ? { ...item, enabled: !item.enabled } : item))}
                role="switch"
                type="button"
              ><i /></button>
            </div>
            <h3>{automation.title}</h3>
            <p>{automation.description}</p>
            <div className="automation-card-footer">
              <span><ZapIcon /> Quando: {automation.trigger}</span>
              <span className={`status ${automation.enabled ? 'status-publicado' : 'status-rascunho'}`}>{automation.enabled ? 'Ativa · prévia' : 'Desativada'}</span>
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  )
}

function ZapIcon() {
  return <Sparkles size={13} aria-hidden="true" />
}

interface CampaignDraft {
  id: number
  title: string
  platform: string
  createdAt: Date
}

function MarketingPage() {
  const [campaigns, setCampaigns] = useState<CampaignDraft[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('Meta Ads')

  function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setCampaigns((current) => [
      { id: Date.now(), title: title.trim(), platform, createdAt: new Date() },
      ...current,
    ])
    setTitle('')
    setShowForm(false)
  }

  const platforms = [
    { name: 'Meta Ads', description: 'Instagram e Facebook', icon: Facebook },
    { name: 'Google Ads', description: 'Pesquisa, display e vídeo', icon: Search },
    { name: 'TikTok Ads', description: 'Vídeos e descoberta', icon: Megaphone },
  ]

  return (
    <PageFrame page="marketing">
      <div className="glass-note mb-5">
        <Megaphone size={16} />
        <span>Esta página é uma prévia: os rascunhos são locais e ainda não são enviados nem publicados nas plataformas.</span>
      </div>
      <SectionHeading
        title="Visão geral das campanhas"
        description="Acompanhe e organize campanhas pagas em um só lugar."
        action={<GlassButton onClick={() => setShowForm((value) => !value)}><Plus size={14} /> Novo rascunho</GlassButton>}
      />
      <div className="metric-grid">
        {[
          ['Campanhas ativas', '0', 'Conecte uma plataforma para começar'],
          ['Investimento', 'R$ 0,00', 'Nenhuma conta de anúncios conectada'],
          ['Resultados', '—', 'Os dados aparecerão após a integração'],
          ['Retorno', '—', 'Disponível com métricas da plataforma'],
        ].map(([label, value, note]) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">{label}<span className="metric-icon mint"><Megaphone size={15} /></span></div>
            <strong>{value}</strong>
            <div className="metric-foot"><small>{note}</small></div>
          </article>
        ))}
      </div>

      {showForm && (
        <form className="panel inline-form mb-5" onSubmit={createCampaign}>
          <label>
            Nome do rascunho
            <input autoFocus maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Lançamento de verão" required value={title} />
          </label>
          <label>
            Plataforma
            <select onChange={(event) => setPlatform(event.target.value)} value={platform}>
              {platforms.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
          </label>
          <GlassButton type="submit"><Check size={14} /> Salvar rascunho</GlassButton>
        </form>
      )}

      <SectionHeading title="Plataformas de anúncios" description="As integrações serão conectadas às APIs oficiais." />
      <div className="accounts-grid mb-5">
        {platforms.map(({ name, description, icon: Icon }) => (
          <article className="panel account-card" key={name}>
            <span className="account-icon"><Icon size={18} /></span>
            <span className="flex-1"><strong>{name}</strong><small>{description}</small></span>
            <span className="status status-rascunho">Em breve</span>
          </article>
        ))}
      </div>

      <SectionHeading title="Rascunhos de campanha" description="Ideias criadas nesta prévia, sem envio para os canais." />
      <section className="panel content-list">
        {campaigns.map((campaign) => (
          <article className="glass-row" key={campaign.id}>
            <span className="metric-icon mint"><Megaphone size={15} /></span>
            <span className="flex-1"><strong>{campaign.title}</strong><span>{campaign.platform} · rascunho local</span></span>
            <span className="table-muted">{campaign.createdAt.toLocaleDateString('pt-BR')}</span>
            <span className="status status-rascunho">Prévia</span>
          </article>
        ))}
        {campaigns.length === 0 && <p className="empty-state">Nenhum rascunho de campanha criado nesta sessão.</p>}
      </section>
    </PageFrame>
  )
}

function AnalyticsPage() {
  const values = [38, 51, 45, 70, 56, 83, 68]
  return (
    <PageFrame page="analytics">
      <div className="glass-note mb-5"><Sparkles size={17} /><span>Indicadores fictícios para demonstrar a experiência. Dados reais dependem das permissões concedidas pelas redes.</span></div>
      <SectionHeading title="Desempenho do workspace" description="Resumo ilustrativo dos últimos sete dias." action={<span className="muted-pill">Últimos 7 dias</span>} />
      <div className="metric-grid">
        {[
          ['Alcance', '12,8 mil', '+12,4%'],
          ['Interações', '1.284', '+8,2%'],
          ['Taxa de engajamento', '4,8%', '+0,6%'],
          ['Cliques no perfil', '392', '+11,1%'],
        ].map(([label, value, change]) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">{label}<span className="metric-icon mint"><ArrowUpRight size={15} /></span></div>
            <strong>{value}</strong>
            <div className="metric-foot"><span className="positive-pill">{change}</span><small>vs. período anterior</small></div>
          </article>
        ))}
      </div>
      <section className="panel analytics-chart">
        <SectionHeading title="Alcance ao longo do tempo" description="Comparação por dia da semana." />
        <div className="analytics-bars" role="img" aria-label="Gráfico ilustrativo de alcance semanal">
          {values.map((value, index) => (
            <div className="analytics-bar-column" key={index}>
              <span>{(value * 124).toLocaleString('pt-BR')}</span>
              <i style={{ height: `${value}%` }} />
              <small>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][index]}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="dashboard-grid page-grid-spaced">
        <section className="panel"><SectionHeading title="Melhor conteúdo" description="Pelo alcance estimado." /><div className="glass-row"><span className="post-thumb sage"><ImagePlus size={17} /></span><span className="flex-1"><strong>5 dicas para sua rotina render mais</strong><span>Instagram · Carrossel</span></span><strong>2,4 mil</strong></div></section>
        <section className="panel"><SectionHeading title="Próximo passo" /><div className="glass-note"><Heart size={16} /><span>Conecte seus canais para descobrir tendências e horários de maior atividade.</span></div><a className="text-link" href="#page-accounts">Ver redes conectadas <ChevronRight size={13} /></a></section>
      </div>
    </PageFrame>
  )
}

function AccountsPage() {
  const networks = [
    { name: 'Instagram', purpose: 'Publicações, comentários e mensagens', icon: <Instagram size={20} /> },
    { name: 'Facebook', purpose: 'Páginas, publicações e caixa de entrada', icon: <Facebook size={20} /> },
    { name: 'TikTok', purpose: 'Vídeos e métricas do perfil', icon: <Sparkles size={20} /> },
    { name: 'YouTube', purpose: 'Vídeos, comentários e desempenho', icon: <Youtube size={20} /> },
  ]
  return (
    <PageFrame page="accounts">
      <div className="glass-note mb-5"><Link2 size={17} /><span>As conexões usarão o fluxo oficial de autorização de cada plataforma. Nenhuma conta é conectada nesta prévia.</span></div>
      <SectionHeading title="Canais disponíveis" description="Escolha por onde gostaria de começar." />
      <div className="accounts-grid">
        {networks.map((network) => (
          <article className="panel account-card" key={network.name}>
            <span className="account-brand-icon">{network.icon}</span>
            <div className="flex-1">
              <h3>{network.name}</h3>
              <p>{network.purpose}</p>
            </div>
            <span className="status status-rascunho">Não conectado</span>
            <button className="glass-button" type="button" disabled><Plus size={14} /> Em breve</button>
          </article>
        ))}
      </div>
      <section className="panel permissions-panel">
        <SectionHeading title="Segurança e permissões" description="A conexão deverá seguir as regras oficiais de cada rede." />
        <div className="schedule-summary">
          <div><strong>01</strong><span>Autorização oficial OAuth</span></div>
          <div><strong>02</strong><span>Acesso revogável a qualquer momento</span></div>
          <div><strong>03</strong><span>Permissões mínimas necessárias</span></div>
        </div>
      </section>
    </PageFrame>
  )
}

function LibraryPage() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Imagens' | 'Vídeos'>('Todos')
  const assets = [
    { name: 'Campanha de primavera', kind: 'Imagem · 1080 × 1350', color: 'sage', tags: 'campanha instagram' },
    { name: 'Vídeo de bastidores', kind: 'Vídeo · 00:28', color: 'clay', tags: 'video bastidores reels' },
    { name: 'Capa do guia da marca', kind: 'Imagem · 1080 × 1080', color: 'sand', tags: 'guia marca imagem' },
    { name: 'Story de lançamento', kind: 'Imagem · 1080 × 1920', color: 'lilac', tags: 'story lançamento instagram' },
  ]
  const visibleAssets = assets.filter((asset) => {
    const matchesQuery = `${asset.name} ${asset.tags}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
    const matchesType = typeFilter === 'Todos' || (typeFilter === 'Imagens' ? asset.kind.startsWith('Imagem') : asset.kind.startsWith('Vídeo'))
    return matchesQuery && matchesType
  })
  return (
    <PageFrame page="library">
      <SectionHeading title="Arquivos e ideias" description="Um espaço visual para materiais prontos e referências." action={<GlassButton disabled><ImagePlus size={14} /> Upload em breve</GlassButton>} />
      <div className="library-toolbar">
        <label className="search-box library-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca..." /></label>
        <div className="filter-tabs" role="tablist" aria-label="Filtrar arquivos por tipo">
          {(['Todos', 'Imagens', 'Vídeos'] as const).map((option) => (
            <button aria-selected={typeFilter === option} className={typeFilter === option ? 'selected' : ''} key={option} onClick={() => setTypeFilter(option)} role="tab" type="button">{option}</button>
          ))}
        </div>
      </div>
      <div className="asset-grid">
        {visibleAssets.map((asset) => (
          <article className="panel asset-card" key={asset.name}>
            <div className={`asset-preview ${asset.color}`}><FileImage size={34} /><button className="glass-icon-button" type="button" aria-label={`Opções para ${asset.name}`}><MoreHorizontal size={16} /></button></div>
            <strong>{asset.name}</strong>
            <span>{asset.kind}</span>
          </article>
        ))}
        {visibleAssets.length === 0 && <p className="empty-state">Nenhum arquivo encontrado.</p>}
      </div>
      <p className="integration-note">Os exemplos são visuais. Upload e armazenamento ainda precisam de integração.</p>
    </PageFrame>
  )
}

function TeamPage() {
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return
    setInvites((current) => [...current, normalizedEmail])
    setEmail('')
    setNotice('Convite adicionado à prévia. O envio de e-mail ainda não está integrado.')
  }
  return (
    <PageFrame page="team">
      <SectionHeading title="Pessoas do workspace" description="Convide sua equipe e organize responsabilidades." action={<span className="muted-pill">Plano de equipe · Prévia</span>} />
      <section className="panel">
        <form className="invite-form" onSubmit={inviteMember}>
          <label className="flex-1">
            E-mail da pessoa
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.com" />
          </label>
          <label>
            Permissão
            <select defaultValue="editor"><option value="admin">Admin</option><option value="editor">Editor</option><option value="analyst">Analista</option></select>
          </label>
          <GlassButton type="submit"><Mail size={14} /> Convidar</GlassButton>
        </form>
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        <div className="content-list">
          <div className="glass-row"><span className="conversation-avatar">LF</span><span className="flex-1"><strong>Luis Fernando</strong><span>Você · Proprietário</span></span><span className="status status-publicado">Admin</span></div>
          {invites.map((invite) => <div className="glass-row" key={invite}><span className="conversation-avatar"><Mail size={15} /></span><span className="flex-1"><strong>{invite}</strong><span>Convite criado nesta prévia</span></span><span className="status status-agendado">Pendente</span></div>)}
        </div>
      </section>
      <div className="glass-note mt-4"><UsersRound size={16} /><span>Antes de lançar, configure papéis e permissões no servidor para proteger contas e dados.</span></div>
    </PageFrame>
  )
}

function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(false)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  return (
    <PageFrame page="settings">
      <div className="settings-layout">
        <nav className="panel settings-nav" aria-label="Seções de configuração">
          <button className="selected" onClick={() => document.getElementById('settings-workspace')?.scrollIntoView({ behavior: 'smooth' })} type="button"><Settings2 size={15} /> Workspace</button>
          <button onClick={() => document.getElementById('settings-notifications')?.scrollIntoView({ behavior: 'smooth' })} type="button"><Bell size={15} /> Notificações</button>
          <button onClick={() => document.getElementById('settings-publishing')?.scrollIntoView({ behavior: 'smooth' })} type="button"><Send size={15} /> Publicações</button>
          <button onClick={() => document.getElementById('settings-security')?.scrollIntoView({ behavior: 'smooth' })} type="button"><Link2 size={15} /> Segurança</button>
        </nav>
        <div className="flex min-w-0 flex-col gap-3">
          <section className="panel" id="settings-workspace">
            <SectionHeading title="Workspace" description="Preferências gerais da sua marca." />
            <label className="settings-field">Nome do workspace<input defaultValue="Minha marca" /></label>
            <label className="settings-field">Fuso horário<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="America/Sao_Paulo">Brasília (GMT-3)</option><option value="America/Manaus">Manaus (GMT-4)</option><option value="Europe/Lisbon">Lisboa (GMT+0)</option></select></label>
          </section>
          <section className="panel" id="settings-notifications">
            <SectionHeading title="Notificações" description="Escolha o que merece chamar sua atenção." />
            <SettingToggle title="Novas mensagens" description="Avisar quando chegar uma conversa." checked={notifications} onChange={() => setNotifications((value) => !value)} />
            <SettingToggle title="Resumo semanal" description="Receber um resumo de atividade do workspace." checked={weeklySummary} onChange={() => setWeeklySummary((value) => !value)} />
          </section>
          <section className="panel" id="settings-publishing">
            <SectionHeading title="Publicações" description="Preferências para revisar antes de publicar." />
            <div className="glass-note"><Clock3 size={16} /><span>Fuso selecionado: {timezone}. A publicação automática será configurada quando os canais forem conectados.</span></div>
          </section>
          <section className="panel" id="settings-security">
            <SectionHeading title="Segurança" description="Acesso às contas sociais e à equipe." />
            <div className="glass-note"><Link2 size={16} /><span>As credenciais das redes devem ser tratadas exclusivamente pelo backend e pelo fluxo OAuth oficial. Não armazene tokens no navegador.</span></div>
          </section>
        </div>
      </div>
      <p className="integration-note mt-3">Estas preferências são locais nesta prévia e ainda não são salvas em uma conta.</p>
    </PageFrame>
  )
}

function SettingToggle({ title, description, checked, onChange }: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="setting-toggle-row">
      <span><strong>{title}</strong><small>{description}</small></span>
      <button aria-checked={checked} className={`switch-control ${checked ? 'on' : ''}`} onClick={onChange} role="switch" type="button"><i /></button>
    </div>
  )
}

export default function WorkspacePages({ page }: { page: WorkspacePage }) {
  switch (page) {
    case 'calendar': return <CalendarPage />
    case 'posts': return <PostsPage />
    case 'inbox': return <InboxPage />
    case 'automations': return <AutomationsPage />
    case 'analytics': return <AnalyticsPage />
    case 'marketing': return <MarketingPage />
    case 'accounts': return <AccountsPage />
    case 'library': return <LibraryPage />
    case 'team': return <TeamPage />
    case 'settings': return <SettingsPage />
    case 'overview': return null
  }
}

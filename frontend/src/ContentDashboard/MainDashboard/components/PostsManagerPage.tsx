import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  FileImage,
  Filter,
  Instagram,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  createPost,
  deletePost,
  getPosts,
  updatePost,
  type ApiPost,
  type PostFormat,
  type PostInput,
  type PostStatus,
  type SocialPlatform,
} from '@/lib/api'

type PostFilter = 'Todas' | 'Rascunho' | 'Agendado' | 'Publicado'

interface PostFormState {
  title: string
  platform: SocialPlatform
  format: PostFormat
  status: PostStatus
  scheduledAt: string
}

const emptyForm: PostFormState = {
  title: '',
  platform: 'INSTAGRAM',
  format: 'POST',
  status: 'DRAFT',
  scheduledAt: '',
}

const platformLabels: Record<SocialPlatform, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Outra rede',
}

const formatLabels: Record<PostFormat, string> = {
  POST: 'Post',
  STORY: 'Stories',
  REEL: 'Reels',
  VIDEO: 'Vídeo',
  CAROUSEL: 'Carrossel',
  SHORT: 'Shorts',
  OTHER: 'Outro formato',
}

const statusLabels: Record<PostStatus, PostFilter> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
}

function toLocalDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function formatPostDate(post: ApiPost): string {
  if (post.scheduledAt) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(post.scheduledAt))
  }
  if (post.status === 'PUBLISHED') {
    return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(post.updatedAt))}`
  }
  return 'Sem data definida'
}

function statusClass(status: PostStatus): string {
  return `status status-${statusLabels[status].toLocaleLowerCase('pt-BR')}`
}

export default function PostsManagerPage() {
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [filter, setFilter] = useState<PostFilter>('Todas')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<PostFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  const visiblePosts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    return posts.filter((post) => {
      const matchesFilter = filter === 'Todas' || statusLabels[post.status] === filter
      const matchesSearch = !normalizedSearch || `${post.title} ${platformLabels[post.platform]} ${formatLabels[post.format]}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [filter, posts, search])

  const counts = useMemo(() => ({
    total: posts.length,
    drafts: posts.filter((post) => post.status === 'DRAFT').length,
    scheduled: posts.filter((post) => post.status === 'SCHEDULED').length,
    published: posts.filter((post) => post.status === 'PUBLISHED').length,
  }), [posts])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  function openEditForm(post: ApiPost) {
    setEditingId(post.id)
    setForm({
      title: post.title,
      platform: post.platform,
      format: post.format,
      status: post.status,
      scheduledAt: toLocalDateTime(post.scheduledAt),
    })
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('Informe um título para a publicação.')
      return
    }

    let scheduledAt: string | null = null
    if (form.status === 'SCHEDULED') {
      if (!form.scheduledAt) {
        setError('Escolha a data e o horário do agendamento.')
        return
      }
      const date = new Date(form.scheduledAt)
      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        setError('O horário agendado precisa estar no futuro.')
        return
      }
      scheduledAt = date.toISOString()
    }

    const payload: PostInput = {
      title,
      platform: form.platform,
      format: form.format,
      status: form.status,
      scheduledAt,
    }

    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = editingId
        ? await updatePost(editingId, payload)
        : await createPost(payload)

      setPosts((current) => {
        const next = editingId
          ? current.map((post) => post.id === saved.id ? saved : post)
          : [saved, ...current]
        return next.sort((a, b) => {
          if (!a.scheduledAt && !b.scheduledAt) return b.createdAt.localeCompare(a.createdAt)
          if (!a.scheduledAt) return 1
          if (!b.scheduledAt) return -1
          return a.scheduledAt.localeCompare(b.scheduledAt)
        })
      })
      setNotice(editingId ? 'Publicação atualizada com sucesso.' : 'Publicação criada com sucesso.')
      setIsFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar a publicação.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(post: ApiPost) {
    if (!window.confirm(`Excluir "${post.title}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(post.id)
    setError('')
    setNotice('')
    try {
      await deletePost(post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
      setNotice('Publicação excluída.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível excluir a publicação.')
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#8fcca0]/60 focus:ring-2 focus:ring-[#8fcca0]/10'
  const labelClass = 'block min-w-0 text-xs font-medium text-[#b8c9be]'

  return (
    <div className="main-area min-w-0 min-h-0 flex-1">
      <header className="topbar sticky top-0 z-10">
        <div className="breadcrumb">
          <a href="#page-overview">Workspace</a>
          <ChevronRight size={13} aria-hidden="true" />
          <strong>Publicações</strong>
        </div>
        <div className="topbar-actions">
          <div className="top-avatar" aria-label="Perfil de usuário">LF</div>
        </div>
      </header>

      <main className="page-content dashboard-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <section className="welcome-row">
          <div>
            <div className="eyebrow"><span className="live-dot" aria-hidden="true" /> ORBIT · CONTEÚDO</div>
            <h1>Publicações</h1>
            <p>Crie, organize e acompanhe o conteúdo do seu workspace.</p>
          </div>
          <button className="primary-button" onClick={openCreateForm} type="button">
            <Plus size={15} aria-hidden="true" /> Nova publicação
          </button>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total', value: counts.total, tone: 'mint' },
            { label: 'Rascunhos', value: counts.drafts, tone: 'gold' },
            { label: 'Agendados', value: counts.scheduled, tone: 'peach' },
            { label: 'Publicados', value: counts.published, tone: 'lilac' },
          ].map((item) => (
            <article className="metric-card" key={item.label}>
              <div className="metric-top">
                <span>{item.label}</span>
                <span className={`metric-icon ${item.tone}`}><FileImage size={15} aria-hidden="true" /></span>
              </div>
              <strong>{item.value}</strong>
              <div className="metric-foot"><small>no seu workspace</small></div>
            </article>
          ))}
        </section>

        {notice && <p className="inline-notice" role="status">{notice}</p>}
        {error && <p className="inline-notice" role="alert">{error}</p>}

        {isFormOpen && (
          <section className="panel mt-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">{editingId ? 'Editar publicação' : 'Nova publicação'}</h2>
                <p className="mt-1 text-xs text-white/50">Defina o conteúdo e onde ele será publicado.</p>
              </div>
              <button className="glass-icon-button" onClick={closeForm} type="button" aria-label="Fechar formulário"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className={`${labelClass} md:col-span-2`}>
                Título da publicação
                <input className={inputClass} autoFocus maxLength={160} required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Lançamento da coleção de verão" />
              </label>

              <label className={labelClass}>
                Rede social
                <select className={inputClass} value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as SocialPlatform }))}>
                  {Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className={labelClass}>
                Formato
                <select className={inputClass} value={form.format} onChange={(event) => setForm((current) => ({ ...current, format: event.target.value as PostFormat }))}>
                  {Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className={labelClass}>
                Situação
                <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PostStatus }))}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="PUBLISHED">Publicado</option>
                </select>
              </label>

              {form.status === 'SCHEDULED' && (
                <label className={labelClass}>
                  Data e horário
                  <input className={inputClass} type="datetime-local" required min={toLocalDateTime(new Date().toISOString())} value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
                </label>
              )}

              {form.status === 'PUBLISHED' && (
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-3 text-xs text-white/55">
                  <Check size={15} className="shrink-0 text-[#9ed5ad]" />
                  Este status é apenas um registro manual. A publicação automática ainda será integrada.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-2">
                <button className="glass-button" disabled={isSaving} onClick={closeForm} type="button">Cancelar</button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? 'Salvando...' : <><Check size={14} /> {editingId ? 'Salvar alterações' : form.status === 'SCHEDULED' ? 'Agendar publicação' : 'Criar publicação'}</>}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel mt-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Seu conteúdo</h2>
              <p className="mt-1 text-xs text-white/45">{visiblePosts.length} de {posts.length} publicações</p>
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <span className="sr-only">Buscar publicações</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#8fcca0]/60" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título ou rede..." />
            </label>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(['Todas', 'Rascunho', 'Agendado', 'Publicado'] as PostFilter[]).map((option) => (
              <button key={option} className={`rounded-full border px-3 py-2 text-xs transition ${filter === option ? 'border-[#8fcca0]/50 bg-[#8fcca0]/15 text-[#c5ebce]' : 'border-white/10 bg-white/3 text-white/55 hover:bg-white/8 hover:text-white'}`} onClick={() => setFilter(option)} type="button" aria-pressed={filter === option}>
                {option}
                <span className="ml-1.5 opacity-60">{option === 'Todas' ? counts.total : option === 'Rascunho' ? counts.drafts : option === 'Agendado' ? counts.scheduled : counts.published}</span>
              </button>
            ))}
            <span className="ml-auto hidden items-center gap-1 text-[11px] text-white/35 sm:inline-flex"><Filter size={13} /> Filtre por situação</span>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading && <p className="empty-state">Carregando publicações...</p>}
            {!isLoading && visiblePosts.map((post) => (
              <article className="glass-row flex-wrap gap-3" key={post.id}>
                <div className="post-thumb sage shrink-0"><Instagram size={17} /></div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{post.title}</strong>
                  <span className="mt-1 block">{platformLabels[post.platform]} · {formatLabels[post.format]}</span>
                  <span className="mt-1 block text-[10px] text-white/40">{post.status === 'SCHEDULED' ? <CalendarClock size={11} className="mr-1 inline" /> : <Clock3 size={11} className="mr-1 inline" />}{formatPostDate(post)}</span>
                </div>
                <span className={statusClass(post.status)}>{statusLabels[post.status]}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button className="glass-icon-button" onClick={() => openEditForm(post)} type="button" aria-label={`Editar ${post.title}`} title="Editar"><Edit3 size={14} /></button>
                  <button className="glass-icon-button" onClick={() => void handleDelete(post)} type="button" disabled={deletingId === post.id} aria-label={`Excluir ${post.title}`} title="Excluir"><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
            {!isLoading && visiblePosts.length === 0 && (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/45"><FileImage size={20} /></div>
                <p className="text-sm font-medium text-white/75">{search || filter !== 'Todas' ? 'Nenhuma publicação encontrada' : 'Seu calendário começa aqui'}</p>
                <p className="mt-1 text-xs text-white/40">{search || filter !== 'Todas' ? 'Tente mudar os filtros ou a busca.' : 'Crie seu primeiro conteúdo para organizar sua presença digital.'}</p>
                {!search && filter === 'Todas' && <button className="primary-button mx-auto mt-4" onClick={openCreateForm} type="button"><Plus size={14} /> Criar primeira publicação</button>}
              </div>
            )}
          </div>
        </section>

        <p className="mt-4 text-center text-[10px] text-white/30">Os conteúdos são salvos no workspace. A publicação nas redes será habilitada após conectar as contas oficiais.</p>
      </main>
    </div>
  )
}

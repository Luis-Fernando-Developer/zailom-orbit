import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  FileImage,
  Filter,
  ImagePlus,
  Video,
  Upload,
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
  uploadPostMediaBatch,
  deletePostMediaItem,
  deletePostMedia,
  getPostMediaItemUrl,
  getPostMediaUrl,
  type ApiPost,
  type PostFormat,
  type PostInput,
  type PostStatus,
  type SocialPlatform,
} from '@/lib/api'
import { getAcceptForRule, getAvailableFormats, getFormatRule, validateMediaFiles } from '@/config/social-platform-rules'

type PostFilter = 'Todas' | 'Rascunho' | 'Agendado' | 'Publicado'

interface PostFormState {
  title: string
  platform: SocialPlatform
  format: PostFormat
  status: PostStatus
  scheduledAt: string
  caption: string
}

const emptyForm: PostFormState = {
  title: '',
  platform: 'INSTAGRAM',
  format: 'POST',
  status: 'DRAFT',
  scheduledAt: '',
  caption: '',
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([])

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

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file))
    setFilePreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [selectedFiles])

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
    setSelectedFiles([])
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  function openEditForm(post: ApiPost) {
    setEditingId(post.id)
    setForm({
      title: post.title,
      caption: post.caption,
      platform: post.platform,
      format: post.format,
      status: post.status,
      scheduledAt: toLocalDateTime(post.scheduledAt),
    })
    setSelectedFiles([])
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setSelectedFiles([])
  }

  const activeRule = getFormatRule(form.platform, form.format)
  const existingMedia = editingId ? posts.find((post) => post.id === editingId)?.mediaItems ?? [] : []
  const legacyMediaCount = editingId && existingMedia.length === 0 && posts.find((post) => post.id === editingId)?.mediaMimeType ? 1 : 0
  const totalMediaCount = existingMedia.length + legacyMediaCount + selectedFiles.length

  function changePlatform(platform: SocialPlatform) {
    const formats = getAvailableFormats(platform)
    setForm((current) => ({
      ...current,
      platform,
      format: formats.some((item) => item.value === current.format) ? current.format : formats[0].value,
    }))
    setSelectedFiles([])
    setError('')
  }

  function changeFormat(format: PostFormat) {
    setForm((current) => ({ ...current, format }))
    setSelectedFiles([])
    setError('')
  }

  function moveSelectedFile(index: number, direction: -1 | 1) {
    setSelectedFiles((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  async function handleRemoveExistingMedia(mediaId: string) {
    if (!editingId) return
    setError('')
    try {
      await deletePostMediaItem(editingId, mediaId)
      await loadPosts()
      setNotice('Mídia removida da publicação.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível remover a mídia.')
    }
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

    if (totalMediaCount < activeRule.minMedia) {
      setError(activeRule.minMedia === 1 ? 'Este formato exige uma mídia.' : `Adicione pelo menos ${activeRule.minMedia} mídias para este formato.`)
      return
    }
    if (totalMediaCount > activeRule.maxMedia) {
      setError(`Este formato permite no máximo ${activeRule.maxMedia} mídias.`)
      return
    }
    const selectedFilesError = validateMediaFiles(selectedFiles, { ...activeRule, minMedia: 0, maxMedia: Math.max(0, activeRule.maxMedia - existingMedia.length - legacyMediaCount) })
    if (selectedFilesError) {
      setError(selectedFilesError)
      return
    }

    const payload: PostInput = {
      title,
      caption: form.caption.trim(),
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

      if (selectedFiles.length > 0) {
        try {
          await uploadPostMediaBatch(saved.id, selectedFiles)
          setPosts(await getPosts())
        } catch (uploadError) {
          setEditingId(saved.id)
          setError(uploadError instanceof Error ? uploadError.message : 'A publicação foi salva, mas o envio das mídias falhou.')
          return
        }
      }

      setNotice(editingId ? 'Publicação atualizada com sucesso.' : 'Publicação criada com sucesso.')
      setIsFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setSelectedFiles([])
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

              <label className={`${labelClass} md:col-span-2`}>
                Legenda
                <textarea className={inputClass + ' min-h-28 resize-y'} maxLength={5000} value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} placeholder="Escreva a legenda da sua publicação..." />
                <span className="mt-1 block text-right text-[10px] text-white/35">{form.caption.length}/5000 caracteres</span>
              </label>

              <div className="md:col-span-2">
                <div className={labelClass}>Mídias da publicação</div>
                <p className="mt-1 text-[11px] text-white/40">{activeRule.hint} {activeRule.maxMedia > 1 ? 'Você pode selecionar vários arquivos de uma vez.' : 'Este formato aceita somente um arquivo.'}</p>
                <label className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/15 px-4 py-6 text-center transition hover:border-[#8fcca0]/50 hover:bg-white/3 ${activeRule.maxMedia === 0 ? 'pointer-events-none opacity-40' : ''}`}>
                  <Upload size={19} className="mb-2 text-[#a8d7b4]" />
                  <strong className="text-xs text-white/80">Adicionar mídia</strong>
                  <span className="mt-1 text-[10px] text-white/40">Até 8 MB por publicação · formatos compatíveis com a rede selecionada</span>
                  <input className="sr-only" type="file" multiple={activeRule.maxMedia > 1} disabled={activeRule.maxMedia === 0} accept={getAcceptForRule(activeRule)} onChange={(event) => {
                    const incoming = Array.from(event.target.files ?? [])
                    if (!incoming.length) return
                    const remaining = Math.max(0, activeRule.maxMedia - existingMedia.length - legacyMediaCount)
                    const combined = [...selectedFiles, ...incoming]
                    const validation = validateMediaFiles(combined, { ...activeRule, minMedia: 0, maxMedia: remaining })
                    if (validation) {
                      setError(validation)
                      event.target.value = ''
                      return
                    }
                    setError('')
                    setSelectedFiles(combined)
                    event.target.value = ''
                  }} />
                </label>
                {(existingMedia.length > 0 || legacyMediaCount > 0 || selectedFiles.length > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {existingMedia.map((media, index) => (
                      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20" key={media.id}>
                        {media.mimeType.startsWith('video/')
                          ? <div className="flex h-28 items-center justify-center text-white/60"><Video size={24} /></div>
                          : <img className="h-28 w-full object-cover" src={getPostMediaItemUrl(editingId!, media.id)} alt={media.fileName} />}
                        <div className="flex items-center justify-between gap-1 p-2">
                          <span className="min-w-0 truncate text-[10px] text-white/60">{media.fileName}</span>
                          <button className="text-red-300" type="button" onClick={() => void handleRemoveExistingMedia(media.id)} aria-label={`Remover ${media.fileName}`}><X size={13} /></button>
                        </div>
                      </div>
                    ))}
                    {legacyMediaCount > 0 && editingId && (
                      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        {posts.find((post) => post.id === editingId)?.mediaMimeType?.startsWith('video/')
                          ? <div className="flex h-28 items-center justify-center text-white/60"><Video size={24} /></div>
                          : <img className="h-28 w-full object-cover" src={getPostMediaUrl(editingId)} alt="Mídia atual" />}
                        <span className="block truncate p-2 text-[10px] text-white/60">Mídia existente</span>
                      </div>
                    )}
                    {selectedFiles.map((file, index) => (
                      <div className="relative overflow-hidden rounded-xl border border-emerald-300/20 bg-emerald-300/5" key={`${file.name}-${file.lastModified}-${index}`}>
                        {file.type.startsWith('video/')
                          ? <div className="flex h-28 items-center justify-center text-white/60"><Video size={24} /></div>
                          : <img className="h-28 w-full object-cover" src={filePreviewUrls[index]} alt={file.name} />}
                        <div className="flex items-center justify-between gap-1 p-2">
                          <span className="min-w-0 truncate text-[10px] text-white/60">{file.name}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button className="text-white/50 disabled:opacity-20" disabled={index === 0} type="button" onClick={() => moveSelectedFile(index, -1)} aria-label="Mover para a esquerda"><ChevronRight className="rotate-180" size={12} /></button>
                            <button className="text-white/50 disabled:opacity-20" disabled={index === selectedFiles.length - 1} type="button" onClick={() => moveSelectedFile(index, 1)} aria-label="Mover para a direita"><ChevronRight size={12} /></button>
                            <button className="text-red-300" type="button" onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${file.name}`}><X size={13} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-right text-[10px] text-white/35">{totalMediaCount}/{activeRule.maxMedia} mídias</p>
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#b8c9be]"><ImagePlus size={14} /> Prévia da publicação</div>
                <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#111713]">
                  <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8fcca0]/15 text-[#a8d7b4]"><Instagram size={14} /></div>
                    <div className="min-w-0"><strong className="block truncate text-xs text-white/85">Sua marca</strong><span className="text-[10px] text-white/35">{platformLabels[form.platform]} · {formatLabels[form.format]}</span></div>
                  </div>
                  {filePreviewUrls.length > 0 ? (
                    <div className={`grid gap-1 ${filePreviewUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {filePreviewUrls.map((url, index) => selectedFiles[index]?.type.startsWith('video/')
                        ? <video className="max-h-80 w-full bg-black object-contain" key={url} src={url} controls />
                        : <img className="max-h-80 w-full bg-black object-contain" key={url} src={url} alt={`Prévia da mídia ${index + 1}`} />)}
                    </div>
                  ) : existingMedia.length > 0 && editingId ? (
                    <div className={`grid gap-1 ${existingMedia.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {existingMedia.map((media) => media.mimeType.startsWith('video/')
                        ? <video className="max-h-80 w-full bg-black object-contain" key={media.id} src={getPostMediaItemUrl(editingId, media.id)} controls />
                        : <img className="max-h-80 w-full bg-black object-contain" key={media.id} src={getPostMediaItemUrl(editingId, media.id)} alt={media.fileName} />)}
                    </div>
                  ) : legacyMediaCount > 0 && editingId ? (
                    posts.find((post) => post.id === editingId)?.mediaMimeType?.startsWith('video/')
                      ? <video className="max-h-80 w-full bg-black object-contain" src={getPostMediaUrl(editingId)} controls />
                      : <img className="max-h-80 w-full bg-black object-contain" src={getPostMediaUrl(editingId)} alt="Mídia da publicação" />
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center gap-2 bg-white/3 text-white/30"><FileImage size={24} /><span className="text-[10px]">Sua mídia aparecerá aqui</span></div>
                  )}
                  <div className="space-y-1 px-3 py-3">
                    <strong className="block truncate text-xs text-white/85">{form.title || 'Título da publicação'}</strong>
                    <p className="whitespace-pre-wrap break-words text-xs text-white/60">{form.caption || 'A legenda que você escrever aparecerá aqui.'}</p>
                  </div>
                </div>
              </div>

              <label className={labelClass}>
                Rede social
                <select className={inputClass} value={form.platform} onChange={(event) => changePlatform(event.target.value as SocialPlatform)}>
                  {Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className={labelClass}>
                Formato
                <select className={inputClass} value={form.format} onChange={(event) => changeFormat(event.target.value as PostFormat)}>
                  {getAvailableFormats(form.platform).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                <div className="post-thumb sage shrink-0 overflow-hidden">
                  {post.mediaMimeType?.startsWith('video/') ? <Video size={17} /> : post.mediaMimeType?.startsWith('image/') ? <img className="h-full w-full object-cover" src={getPostMediaUrl(post.id)} alt="" /> : <Instagram size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{post.title}</strong>
                  {post.caption && <span className="mt-1 block line-clamp-2">{post.caption}</span>}
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

export interface AuthUser {
  id: string
  name: string
  email: string
}

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED'
export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'LINKEDIN' | 'OTHER'
export type PostFormat = 'POST' | 'STORY' | 'REEL' | 'VIDEO' | 'CAROUSEL' | 'SHORT' | 'OTHER'

export interface ApiPost {
  id: string
  title: string
  caption: string
  mediaName: string | null
  mediaMimeType: string | null
  platform: SocialPlatform
  format: PostFormat
  status: PostStatus
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PostInput {
  title: string
  caption: string
  platform: SocialPlatform
  format: PostFormat
  status: PostStatus
  scheduledAt: string | null
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Não foi possível conectar ao servidor. Verifique se a API está em execução.', 0)
    }
    throw error
  }

  if (response.status === 204) return undefined as T
  const body = await response.json() as ApiErrorBody & T
  if (!response.ok) {
    throw new ApiError(
      body.error?.message ?? 'O servidor não conseguiu concluir a solicitação.',
      response.status,
      body.error?.code,
    )
  }
  return body
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/api/auth/me')
  return response.user
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return response.user
}

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return response.user
}

export async function signOut(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' })
}

export function getPosts(params: { from?: string; to?: string } = {}): Promise<ApiPost[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const queryString = search.toString()
  const query = queryString ? `?${queryString}` : ''
  return request<ApiPost[]>(`/api/posts${query}`)
}

export function createPost(input: PostInput): Promise<ApiPost> {
  return request<ApiPost>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePost(id: string, input: PostInput): Promise<ApiPost> {
  return request<ApiPost>(`/api/posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deletePost(id: string): Promise<void> {
  return request<void>(`/api/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getPostMediaUrl(id: string): string {
  return `${apiBaseUrl}/api/posts/${encodeURIComponent(id)}/media`
}

export async function uploadPostMedia(id: string, file: File): Promise<void> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Não foi possível ler o arquivo selecionado.'))
        return
      }
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'))
    reader.readAsDataURL(file)
  })

  await request<void>(`/api/posts/${encodeURIComponent(id)}/media`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64 }),
  })
}

export function deletePostMedia(id: string): Promise<void> {
  return request<void>(`/api/posts/${encodeURIComponent(id)}/media`, { method: 'DELETE' })
}

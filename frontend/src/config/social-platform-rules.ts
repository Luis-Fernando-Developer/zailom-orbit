import type { PostFormat, SocialPlatform } from '@/lib/api'

export type MediaKind = 'image' | 'video'

export interface FormatRule {
  value: PostFormat
  label: string
  mediaTypes: MediaKind[]
  minMedia: number
  maxMedia: number
  hint: string
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const videoTypes = ['video/mp4', 'video/webm']

const rules: Record<SocialPlatform, FormatRule[]> = {
  INSTAGRAM: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo para o feed.' },
    { value: 'CAROUSEL', label: 'Carrossel', mediaTypes: ['image', 'video'], minMedia: 2, maxMedia: 10, hint: 'De 2 a 10 imagens e/ou vídeos.' },
    { value: 'REEL', label: 'Reels', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.' },
    { value: 'STORY', label: 'Stories', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo por story.' },
  ],
  FACEBOOK: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 0, maxMedia: 1, hint: 'Texto livre, com uma imagem ou vídeo opcional.' },
    { value: 'CAROUSEL', label: 'Carrossel', mediaTypes: ['image', 'video'], minMedia: 2, maxMedia: 10, hint: 'De 2 a 10 imagens e/ou vídeos.' },
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.' },
    { value: 'REEL', label: 'Reels', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por Reel.' },
    { value: 'STORY', label: 'Stories', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo por story.' },
  ],
  TIKTOK: [
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.' },
    { value: 'CAROUSEL', label: 'Carrossel de fotos', mediaTypes: ['image'], minMedia: 2, maxMedia: 35, hint: 'De 2 a 35 imagens.' },
    { value: 'POST', label: 'Foto', mediaTypes: ['image'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem por publicação de foto.' },
  ],
  YOUTUBE: [
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um arquivo de vídeo por envio.' },
    { value: 'SHORT', label: 'Shorts', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo vertical. O YouTube classifica como Short conforme os critérios da plataforma.' },
  ],
  LINKEDIN: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 0, maxMedia: 1, hint: 'Texto livre, com uma imagem ou vídeo opcional.' },
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.' },
    { value: 'CAROUSEL', label: 'Múltiplas imagens', mediaTypes: ['image'], minMedia: 2, maxMedia: 20, hint: 'De 2 a 20 imagens em uma publicação orgânica.' },
  ],
  OTHER: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 0, maxMedia: 1, hint: 'Texto livre, com uma imagem ou vídeo opcional.' },
    { value: 'CAROUSEL', label: 'Carrossel', mediaTypes: ['image', 'video'], minMedia: 2, maxMedia: 10, hint: 'De 2 a 10 imagens e/ou vídeos.' },
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.' },
    { value: 'STORY', label: 'Stories', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo por story.' },
  ],
}

export function getAvailableFormats(platform: SocialPlatform): FormatRule[] {
  return rules[platform]
}

export function getFormatRule(platform: SocialPlatform, format: PostFormat): FormatRule {
  return rules[platform].find((rule) => rule.value === format) ?? rules[platform][0]
}

export function getAcceptForRule(rule: FormatRule): string {
  return [
    ...(rule.mediaTypes.includes('image') ? imageTypes : []),
    ...(rule.mediaTypes.includes('video') ? videoTypes : []),
  ].join(',')
}

export function validateMediaFiles(files: File[], rule: FormatRule): string | null {
  if (files.length < rule.minMedia) {
    return rule.minMedia === 1 ? 'Este formato exige uma mídia.' : `Adicione pelo menos ${rule.minMedia} mídias para este formato.`
  }
  if (files.length > rule.maxMedia) {
    return `Este formato permite no máximo ${rule.maxMedia} mídias.`
  }
  for (const file of files) {
    const kind: MediaKind | null = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
    if (!kind || !rule.mediaTypes.includes(kind)) {
      return rule.mediaTypes.length === 1 && rule.mediaTypes[0] === 'video'
        ? 'Este formato aceita somente vídeos.'
        : rule.mediaTypes.length === 1 && rule.mediaTypes[0] === 'image'
          ? 'Este formato aceita somente imagens.'
          : 'O tipo de arquivo não é permitido neste formato.'
    }
    if (file.size > 8 * 1024 * 1024) return 'Cada arquivo deve ter no máximo 8 MB.'
  }
  if (files.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
    return 'O conjunto de mídias deve ter no máximo 8 MB por publicação.'
  }
  return null
}

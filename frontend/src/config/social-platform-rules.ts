import type { PostFormat, SocialPlatform } from '@/lib/api'

export type MediaKind = 'image' | 'video'

export interface VideoConstraints {
  minDuration?: number
  maxDuration?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  minAspectRatio?: number
  maxAspectRatio?: number
  recommendedAspectRatio?: number
  recommendedRatioLabel?: string
}

export interface FormatRule {
  value: PostFormat
  label: string
  mediaTypes: MediaKind[]
  minMedia: number
  maxMedia: number
  hint: string
  video?: VideoConstraints
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const videoTypes = ['video/mp4', 'video/webm']

const verticalVideo: VideoConstraints = {
  minDuration: 3,
  maxDuration: 900,
  minWidth: 720,
  maxWidth: 1920,
  recommendedAspectRatio: 9 / 16,
  recommendedRatioLabel: '9:16 (vertical)',
}

const rules: Record<SocialPlatform, FormatRule[]> = {
  INSTAGRAM: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo para o feed.', video: { minDuration: 3, maxDuration: 60, minWidth: 320, maxWidth: 1920, minAspectRatio: 0.8, maxAspectRatio: 1.91, recommendedAspectRatio: 4 / 5, recommendedRatioLabel: '4:5 (feed)' } },
    { value: 'CAROUSEL', label: 'Carrossel', mediaTypes: ['image', 'video'], minMedia: 2, maxMedia: 10, hint: 'De 2 a 10 imagens e/ou vídeos.', video: { minDuration: 3, maxDuration: 60, minWidth: 320, maxWidth: 1920, minAspectRatio: 0.8, maxAspectRatio: 1.91 } },
    { value: 'REEL', label: 'Reels', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.', video: verticalVideo },
    { value: 'STORY', label: 'Stories', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo por story.', video: { minDuration: 1, maxDuration: 60, minWidth: 500, maxWidth: 1920, recommendedAspectRatio: 9 / 16, recommendedRatioLabel: '9:16 (vertical)' } },
  ],
  FACEBOOK: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 0, maxMedia: 1, hint: 'Texto livre, com uma imagem ou vídeo opcional.' },
    { value: 'CAROUSEL', label: 'Carrossel', mediaTypes: ['image', 'video'], minMedia: 2, maxMedia: 10, hint: 'De 2 a 10 imagens e/ou vídeos.' },
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.', video: { minDuration: 1, maxDuration: 14400, minWidth: 256, maxWidth: 4096 } },
    { value: 'REEL', label: 'Reels', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por Reel.', video: { minDuration: 3, maxDuration: 90, minWidth: 540, minHeight: 960, recommendedAspectRatio: 9 / 16, recommendedRatioLabel: '9:16 (vertical)' } },
    { value: 'STORY', label: 'Stories', mediaTypes: ['image', 'video'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem ou um vídeo por story.', video: { minDuration: 1, maxDuration: 60, minWidth: 540, minHeight: 960, recommendedAspectRatio: 9 / 16, recommendedRatioLabel: '9:16 (vertical)' } },
  ],
  TIKTOK: [
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.', video: { minDuration: 3, maxDuration: 600, minWidth: 360, minHeight: 360, maxWidth: 4096, maxHeight: 4096, recommendedAspectRatio: 9 / 16, recommendedRatioLabel: '9:16 (vertical)' } },
    { value: 'CAROUSEL', label: 'Carrossel de fotos', mediaTypes: ['image'], minMedia: 2, maxMedia: 35, hint: 'De 2 a 35 imagens.' },
    { value: 'POST', label: 'Foto', mediaTypes: ['image'], minMedia: 1, maxMedia: 1, hint: 'Uma imagem por publicação de foto.' },
  ],
  YOUTUBE: [
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um arquivo de vídeo por envio.', video: { minDuration: 1, maxDuration: 43200, minWidth: 256, minHeight: 144, recommendedAspectRatio: 16 / 9, recommendedRatioLabel: '16:9 (horizontal)' } },
    { value: 'SHORT', label: 'Shorts', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Vídeo quadrado ou vertical com até 3 minutos.', video: { minDuration: 1, maxDuration: 180, minWidth: 360, minHeight: 360, maxWidth: 2160, maxHeight: 3840, maxAspectRatio: 1, recommendedAspectRatio: 9 / 16, recommendedRatioLabel: '9:16 (vertical)' } },
  ],
  LINKEDIN: [
    { value: 'POST', label: 'Post', mediaTypes: ['image', 'video'], minMedia: 0, maxMedia: 1, hint: 'Texto livre, com uma imagem ou vídeo opcional.', video: { minDuration: 3, maxDuration: 900, minWidth: 256, minHeight: 144, maxWidth: 4096, maxHeight: 2304, minAspectRatio: 1 / 2.4, maxAspectRatio: 2.4 } },
    { value: 'VIDEO', label: 'Vídeo', mediaTypes: ['video'], minMedia: 1, maxMedia: 1, hint: 'Um vídeo por publicação.', video: { minDuration: 3, maxDuration: 900, minWidth: 256, minHeight: 144, maxWidth: 4096, maxHeight: 2304, minAspectRatio: 1 / 2.4, maxAspectRatio: 2.4 } },
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

export function getVideoConstraintHint(rule: FormatRule): string | null {
  const limits = rule.video
  if (!limits) return null
  const parts: string[] = []
  if (limits.minDuration !== undefined || limits.maxDuration !== undefined) {
    const min = limits.minDuration ?? 0
    const max = limits.maxDuration === undefined ? null : limits.maxDuration
    parts.push(max === null ? 'duração a partir de ' + min + 's' : 'duração ' + min + 's–' + max + 's')
  }
  if (limits.minWidth || limits.minHeight || limits.maxWidth || limits.maxHeight) {
    parts.push('resolução mínima ' + (limits.minWidth ?? 0) + '×' + (limits.minHeight ?? 0) + ' px' + (limits.maxWidth || limits.maxHeight ? ', máxima ' + (limits.maxWidth ?? '—') + '×' + (limits.maxHeight ?? '—') + ' px' : ''))
  }
  if (limits.recommendedRatioLabel) parts.push('proporção recomendada ' + limits.recommendedRatioLabel)
  return parts.join(' · ')
}

export function validateMediaFiles(files: File[], rule: FormatRule): string | null {
  if (files.length < rule.minMedia) {
    return rule.minMedia === 1 ? 'Este formato exige uma mídia.' : 'Adicione pelo menos ' + rule.minMedia + ' mídias para este formato.'
  }
  if (files.length > rule.maxMedia) return 'Este formato permite no máximo ' + rule.maxMedia + ' mídias.'
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

interface VideoMetadata {
  width: number
  height: number
  duration: number
}

function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const metadata = { width: video.videoWidth, height: video.videoHeight, duration: video.duration }
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
      if (!metadata.width || !metadata.height || !Number.isFinite(metadata.duration)) {
        reject(new Error('Não foi possível ler os dados do vídeo "' + file.name + '".'))
        return
      }
      resolve(metadata)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('O arquivo "' + file.name + '" não parece ser um vídeo válido ou está corrompido.'))
    }
    video.src = url
  })
}

export async function validateVideoFiles(files: File[], rule: FormatRule): Promise<string | null> {
  if (!rule.video) return null
  for (const file of files.filter((item) => item.type.startsWith('video/'))) {
    let metadata: VideoMetadata
    try {
      metadata = await readVideoMetadata(file)
    } catch (error) {
      return error instanceof Error ? error.message : 'Não foi possível analisar um dos vídeos.'
    }
    const { width, height, duration } = metadata
    const constraints = rule.video
    const ratio = width / height
    const label = file.name
    if (constraints.minDuration !== undefined && duration < constraints.minDuration) return '"' + label + '": o vídeo precisa ter pelo menos ' + constraints.minDuration + ' segundos.'
    if (constraints.maxDuration !== undefined && duration > constraints.maxDuration) return '"' + label + '": o limite de duração deste formato é ' + constraints.maxDuration + ' segundos.'
    if (constraints.minWidth !== undefined && width < constraints.minWidth) return '"' + label + '": largura mínima de ' + constraints.minWidth + 'px.'
    if (constraints.minHeight !== undefined && height < constraints.minHeight) return '"' + label + '": altura mínima de ' + constraints.minHeight + 'px.'
    if (constraints.maxWidth !== undefined && width > constraints.maxWidth) return '"' + label + '": largura máxima de ' + constraints.maxWidth + 'px.'
    if (constraints.maxHeight !== undefined && height > constraints.maxHeight) return '"' + label + '": altura máxima de ' + constraints.maxHeight + 'px.'
    if (constraints.minAspectRatio !== undefined && ratio < constraints.minAspectRatio) return '"' + label + '": proporção muito vertical para este formato.'
    if (constraints.maxAspectRatio !== undefined && ratio > constraints.maxAspectRatio) return '"' + label + '": proporção muito horizontal para este formato.'
  }
  return null
}

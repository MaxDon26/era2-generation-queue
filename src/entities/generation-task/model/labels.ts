import type { GenType } from './types'

/** Родительный падеж типа генерации — для заголовка «Генерация {…}». */
export const GEN_TYPE_LABEL: Record<GenType, string> = {
  text: 'текста',
  image: 'изображения',
  video: 'видео',
  audio: 'аудио',
}

/** Заголовок для статус-бара: «Генерация изображения» и т.п. */
export function genTitle(type: GenType): string {
  return `Генерация ${GEN_TYPE_LABEL[type]}`
}

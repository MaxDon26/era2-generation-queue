import type { GenerationTask } from './types'

/** Базовые оценочные длительности генерации по типу, мс (video/audio дольше — тз.md:121). */
const DURATION_BY_TYPE = {
  text: 8_000,
  image: 15_000,
  video: 45_000,
  audio: 30_000,
} as const

const MINUTE = 60_000
const SECOND = 1_000

/**
 * Стартовый сид очереди (тз.md:127): 10 задач в разных статусах, чтобы экран
 * при загрузке был «живым» — 2 running с прогрессом, 4 queued, 2 done, 1 failed,
 * 1 canceled; представлены все типы, video/audio с большой длительностью.
 *
 * Принимает `now` параметром — детерминированность для тестов (наш паттерн
 * инъекции времени). Все таймстемпы отсчитываются относительно `now`.
 */
export function createSeed(now: number = Date.now()): GenerationTask[] {
  return [
    {
      id: 'seed-01',
      type: 'image',
      status: 'running',
      prompt: 'Неоновый киберпанк-город под дождём, вид сверху, кинематографично',
      model: 'DALL·E 3',
      progress: 45,
      credits: 8,
      estimatedDurationMs: DURATION_BY_TYPE.image,
      createdAt: now - 9 * MINUTE,
      startedAt: now - 7 * SECOND,
    },
    {
      id: 'seed-02',
      type: 'video',
      status: 'running',
      prompt: 'Таймлапс распускающегося цветка, макросъёмка, 4K',
      model: 'Sora',
      progress: 18,
      credits: 40,
      estimatedDurationMs: DURATION_BY_TYPE.video,
      createdAt: now - 8 * MINUTE,
      startedAt: now - 9 * SECOND,
    },
    {
      id: 'seed-03',
      type: 'text',
      status: 'queued',
      prompt: 'Напиши краткое резюме статьи о квантовых вычислениях для новичков',
      model: 'GPT-4o',
      progress: 0,
      credits: 2,
      estimatedDurationMs: DURATION_BY_TYPE.text,
      createdAt: now - 7 * MINUTE,
    },
    {
      id: 'seed-04',
      type: 'image',
      status: 'queued',
      prompt: 'Минималистичный логотип кофейни в скандинавском стиле, вектор',
      model: 'Midjourney v6',
      progress: 0,
      credits: 6,
      estimatedDurationMs: DURATION_BY_TYPE.image,
      createdAt: now - 6 * MINUTE,
    },
    {
      id: 'seed-05',
      type: 'audio',
      status: 'queued',
      prompt: 'Эмбиент-трек для медитации, 2 минуты, спокойный синтезатор',
      model: 'Suno v3',
      progress: 0,
      credits: 20,
      estimatedDurationMs: DURATION_BY_TYPE.audio,
      createdAt: now - 5 * MINUTE,
    },
    {
      id: 'seed-06',
      type: 'video',
      status: 'queued',
      prompt: 'Анимация логотипа: плавное появление с частицами, 5 секунд',
      model: 'Runway Gen-3',
      progress: 0,
      credits: 35,
      estimatedDurationMs: DURATION_BY_TYPE.video,
      createdAt: now - 4 * MINUTE,
    },
    {
      id: 'seed-07',
      type: 'text',
      status: 'done',
      prompt: 'Сгенерируй 10 идей названий для стартапа в сфере экологии',
      model: 'Claude Sonnet 4.6',
      progress: 100,
      credits: 2,
      estimatedDurationMs: DURATION_BY_TYPE.text,
      createdAt: now - 20 * MINUTE,
      startedAt: now - 19 * MINUTE,
      finishedAt: now - 19 * MINUTE + 7 * SECOND,
    },
    {
      id: 'seed-08',
      type: 'image',
      status: 'done',
      prompt: 'Портрет рыжего кота-астронавта в скафандре, фотореализм',
      model: 'Stable Diffusion XL',
      progress: 100,
      credits: 6,
      estimatedDurationMs: DURATION_BY_TYPE.image,
      createdAt: now - 18 * MINUTE,
      startedAt: now - 17 * MINUTE,
      finishedAt: now - 17 * MINUTE + 14 * SECOND,
    },
    {
      id: 'seed-09',
      type: 'video',
      status: 'failed',
      prompt: 'Реалистичный полёт дрона над горным озером на закате',
      model: 'Sora',
      progress: 62,
      credits: 40,
      estimatedDurationMs: DURATION_BY_TYPE.video,
      createdAt: now - 15 * MINUTE,
      startedAt: now - 14 * MINUTE,
      finishedAt: now - 13 * MINUTE,
      error: 'Превышено время ожидания',
    },
    {
      id: 'seed-10',
      type: 'audio',
      status: 'canceled',
      prompt: 'Озвучка рекламного ролика мужским голосом, дружелюбный тон',
      model: 'ElevenLabs',
      progress: 30,
      credits: 18,
      estimatedDurationMs: DURATION_BY_TYPE.audio,
      createdAt: now - 12 * MINUTE,
      startedAt: now - 11 * MINUTE,
      finishedAt: now - 11 * MINUTE + 9 * SECOND,
    },
  ]
}

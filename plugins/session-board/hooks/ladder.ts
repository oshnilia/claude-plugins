// Karpathy's format ladder under a long answer: text in ASD-STE100, a diagram, an HTML page, an animated explainer.
// A press sends the request into the session as the person's own message. The messages work with or without the
// legible plugin; with it, its skills pick them up.

/** Show the ladder only under an answer with at least this many words of prose. */
export const LADDER_MIN_WORDS = 120

export type Rung = { id: string; label: string; text: string }

export const RUNGS: Rung[] = [
  { id: 'ste', label: 'STE', text: 'Перепиши свой последний ответ проще: на английском — в ASD-STE100 на 80%, на русском — в упрощённом техническом русском. Только переписанный текст.' },
  { id: 'diagram', label: 'Схема', text: 'Покажи свой последний ответ схемой: сначала диаграмма, после неё не больше трёх предложений.' },
  { id: 'html', label: 'HTML', text: 'Сделай из своего последнего ответа одну HTML-страницу в папке explainers/: ответ наверху, детали по клику, всё офлайн, без CDN. Скажи путь к файлу.' },
  { id: 'animate', label: 'Анимация', text: 'Сделай пошаговую анимацию своего последнего ответа: один офлайн HTML-файл в папке explainers/, схема строится по шагам, у каждого шага подпись. Скажи путь к файлу.' },
]

/** Words of prose in an answer: code, tables, headings and links do not count. */
export function proseWords(answer: string): number {
  const text = answer
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .split('\n')
    .filter(l => !/^\s*(\||#)/.test(l))
    .join(' ')
  return (text.match(/\p{L}[\p{L}\p{N}'’-]*/gu) ?? []).length
}

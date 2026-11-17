/** Short Russian lines for the mascot's speech bubble. After mistakes: only encouragement. */
export const PHRASES = {
  praise: ['Отлично!', 'Точно в цель!', 'Красиво!', 'Так держать!', 'Ты в потоке'],
  encourage: [
    'Ничего, бывает!',
    'Почти! Ещё разок',
    'Спокойно, найдём',
    'Ошибки — тоже практика',
    'Без спешки, ты справишься',
  ],
  celebrate: ['Огонь!', 'Ты в потоке', 'Вот это серия!', 'Невероятно!'],
  sleepy: ['Я подремлю…', 'Разбуди меня нажатием'],
  thinking: ['Хм, дай подумать…', 'Ничего, подглядывать можно'],
  accidentalsIntro: 'Теперь и чёрные клавиши!',
} as const;

export const streakPhrase = (n: number) => `${n} подряд!`;

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

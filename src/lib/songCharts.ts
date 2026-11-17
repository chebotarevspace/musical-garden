/**
 * Chord charts of popular songs from many genres.
 *
 * Only the harmony is given — simplified, one chord per bar, with section labels
 * («Куплет», «Припев») instead of lyrics. Lyrics and melodies of copyrighted songs are
 * not included; add your own words with «＋ Своя» if you like.
 * Public-domain songs may carry their words.
 */
export interface ChartSection {
  /** Shown under the first bar of the section. */
  label: string;
  /** One chord per bar, space-separated. */
  bars: string;
  /** Words per bar for public-domain songs (same count as bars). */
  words?: string[];
}

export interface Chart {
  id: string;
  title: string;
  origin: string;
  group: string;
  key: string;
  meter: 3 | 4;
  tempo: number;
  sections: ChartSection[];
  melody?: string[];
  /** Note lengths in beats per bar, parallel to `melody`. */
  rhythm?: string[];
}

const NOTE = 'аккорды без слов, упрощённо';

export const CHARTS: Chart[] = [
  // ---------------- Поп ----------------
  {
    id: 'im-yours',
    title: "I'm Yours",
    origin: `Jason Mraz · ${NOTE} (оригинал в B)`,
    group: 'Поп',
    key: 'C',
    meter: 4,
    tempo: 76,
    sections: [
      { label: 'Куплет', bars: 'C G Am F C G Am F' },
      { label: 'Припев', bars: 'C G Am F C G Am F' },
    ],
  },
  {
    id: 'perfect',
    title: 'Perfect',
    origin: `Ed Sheeran · ${NOTE} (оригинал в A♭)`,
    group: 'Поп',
    key: 'G',
    meter: 3,
    tempo: 63,
    sections: [
      { label: 'Куплет', bars: 'G Em C D G Em C D' },
      { label: 'Припев', bars: 'Em C G D Em C D D' },
    ],
  },
  {
    id: 'someone-like-you',
    title: 'Someone Like You',
    origin: `Adele · ${NOTE}`,
    group: 'Поп',
    key: 'A',
    meter: 4,
    tempo: 68,
    sections: [
      { label: 'Куплет', bars: 'A E F#m D A E F#m D' },
      { label: 'Припев', bars: 'A E F#m D A E F#m D' },
    ],
  },
  {
    id: 'shape-of-you',
    title: 'Shape of You',
    origin: `Ed Sheeran · ${NOTE}`,
    group: 'Поп',
    key: 'C#m',
    meter: 4,
    tempo: 96,
    sections: [{ label: 'Весь трек', bars: 'C#m F#m A B C#m F#m A B' }],
  },
  {
    id: 'viva-la-vida',
    title: 'Viva la Vida',
    origin: `Coldplay · ${NOTE} (оригинал в A♭)`,
    group: 'Поп',
    key: 'C',
    meter: 4,
    tempo: 120,
    sections: [
      { label: 'Куплет', bars: 'C D G Em C D G Em' },
      { label: 'Припев', bars: 'C D G Em C D G Em' },
    ],
  },

  // ---------------- The Beatles ----------------
  {
    id: 'let-it-be',
    title: 'Let It Be',
    origin: `The Beatles · ${NOTE}`,
    group: 'The Beatles',
    key: 'C',
    meter: 4,
    tempo: 72,
    sections: [
      { label: 'Куплет', bars: 'C G Am F C G F C' },
      { label: 'Куплет', bars: 'C G Am F C G F C' },
      { label: 'Припев', bars: 'Am G F C C G F C' },
    ],
  },
  {
    id: 'hey-jude',
    title: 'Hey Jude',
    origin: `The Beatles · ${NOTE}`,
    group: 'The Beatles',
    key: 'F',
    meter: 4,
    tempo: 74,
    sections: [
      { label: 'Куплет', bars: 'F C C7 F Bb F C7 F' },
      { label: 'Переход', bars: 'F7 Bb Dm Gm C7 F F C7' },
      { label: 'Финал', bars: 'F Eb Bb F F Eb Bb F' },
    ],
  },
  {
    id: 'yesterday',
    title: 'Yesterday',
    origin: `The Beatles · ${NOTE}`,
    group: 'The Beatles',
    key: 'F',
    meter: 4,
    tempo: 96,
    sections: [
      { label: 'Куплет', bars: 'F Em7 A7 Dm Bb C7 F F' },
      { label: 'Переход', bars: 'Em7 A7 Dm C Bb Gm C7 F' },
    ],
  },
  {
    id: 'here-comes-the-sun',
    title: 'Here Comes the Sun',
    origin: `The Beatles · ${NOTE} (на гитаре — каподастр на 7-м ладу, аккорды в D)`,
    group: 'The Beatles',
    key: 'A',
    meter: 4,
    tempo: 129,
    sections: [
      { label: 'Припев', bars: 'A D B7 A' },
      { label: 'Куплет', bars: 'A D E7 E7 A D E7 E7' },
      { label: 'Припев', bars: 'A D B7 A A D B7 A' },
    ],
  },
  {
    id: 'yellow-submarine',
    title: 'Yellow Submarine',
    origin: `The Beatles · ${NOTE}`,
    group: 'The Beatles',
    key: 'G',
    meter: 4,
    tempo: 112,
    sections: [
      { label: 'Куплет', bars: 'G D C G Em Am C D' },
      { label: 'Припев', bars: 'G D D G G D D G' },
    ],
  },
  {
    id: 'in-my-life',
    title: 'In My Life',
    origin: `The Beatles · ${NOTE}: «битловский» ход D → Dm`,
    group: 'The Beatles',
    key: 'A',
    meter: 4,
    tempo: 103,
    sections: [
      { label: 'Куплет', bars: 'A E F#m A7 D Dm A A' },
      { label: 'Куплет', bars: 'A E F#m A7 D Dm A A' },
    ],
  },
  {
    id: 'love-me-do',
    title: 'Love Me Do',
    origin: `The Beatles · ${NOTE}`,
    group: 'The Beatles',
    key: 'G',
    meter: 4,
    tempo: 148,
    sections: [
      { label: 'Куплет', bars: 'G C G C G C G G' },
      { label: 'Переход', bars: 'D C G G D C G G' },
    ],
  },
  {
    id: 'cant-buy-me-love',
    title: "Can't Buy Me Love",
    origin: `The Beatles · ${NOTE}: блюзовый квадрат`,
    group: 'The Beatles',
    key: 'C',
    meter: 4,
    tempo: 172,
    sections: [
      { label: 'Припев', bars: 'Em Am Em Am Dm G7 G7 G7' },
      { label: 'Куплет', bars: 'C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 C7' },
    ],
  },
  {
    id: 'twist-and-shout',
    title: 'Twist and Shout',
    origin: `The Beatles (кавер) · ${NOTE}`,
    group: 'The Beatles',
    key: 'D',
    meter: 4,
    tempo: 126,
    sections: [{ label: 'Весь трек', bars: 'D G A A D G A A' }],
  },
  {
    id: 'ob-la-di',
    title: 'Ob-La-Di, Ob-La-Da',
    origin: `The Beatles · ${NOTE} (оригинал в B♭)`,
    group: 'The Beatles',
    key: 'A',
    meter: 4,
    tempo: 112,
    sections: [
      { label: 'Куплет', bars: 'A E E7 A A D A E A' },
      { label: 'Припев', bars: 'A E F#m A E A' },
    ],
  },

  // ---------------- Ла-Ла Ленд ----------------
  {
    id: 'city-of-stars',
    title: 'City of Stars',
    origin: `«Ла-Ла Ленд», Джастин Гурвиц · ${NOTE}`,
    group: 'Ла-Ла Ленд',
    key: 'Dm',
    meter: 4,
    tempo: 92,
    sections: [
      { label: 'Куплет', bars: 'Gm C7 Dm7 Dm7 Gm C7 F F Gm C7 F F7 Gm A7 Dm Dm' },
      { label: 'Припев', bars: 'Bb C7 A7 Dm7 Bb C7 Dm7 Dm7 Bb C7 A7 Dm7 Bb A7 Dm Dm' },
    ],
  },
  {
    id: 'another-day-of-sun',
    title: 'Another Day of Sun',
    origin: `«Ла-Ла Ленд», Джастин Гурвиц · ${NOTE} (оригинал в E♭)`,
    group: 'Ла-Ла Ленд',
    key: 'C',
    meter: 4,
    tempo: 126,
    sections: [
      { label: 'Вступление', bars: 'F G Am Em F G C Em' },
      { label: 'Куплет', bars: 'Dm G C A Dm G C Am' },
      { label: 'Припев', bars: 'F G Am Dm G C Am G Am G Am G C E' },
    ],
  },
  {
    id: 'audition',
    title: 'Audition (The Fools Who Dream)',
    origin: `«Ла-Ла Ленд», Джастин Гурвиц · ${NOTE}`,
    group: 'Ла-Ла Ленд',
    key: 'F',
    meter: 3,
    tempo: 94,
    sections: [
      { label: 'Куплет', bars: 'F C Bb Bbm Dm F Gm C7' },
      { label: 'Припев', bars: 'Gm C7 F Fmaj7 Gm C7 F Fmaj7' },
    ],
  },

  // ---------------- Рок ----------------
  {
    id: 'knockin',
    title: "Knockin' on Heaven's Door",
    origin: `Bob Dylan · ${NOTE}`,
    group: 'Рок',
    key: 'G',
    meter: 4,
    tempo: 68,
    sections: [
      { label: 'Куплет', bars: 'G D Am Am G D C C' },
      { label: 'Припев', bars: 'G D Am Am G D C C' },
    ],
  },
  {
    id: 'stand-by-me',
    title: 'Stand By Me',
    origin: `Ben E. King · ${NOTE} (оригинал в A)`,
    group: 'Рок',
    key: 'G',
    meter: 4,
    tempo: 118,
    sections: [
      { label: 'Куплет', bars: 'G G Em Em C D G G' },
      { label: 'Припев', bars: 'G G Em Em C D G G' },
    ],
  },
  {
    id: 'sweet-home',
    title: 'Sweet Home Alabama',
    origin: `Lynyrd Skynyrd · ${NOTE}`,
    group: 'Рок',
    key: 'D',
    meter: 4,
    tempo: 98,
    sections: [{ label: 'Риф', bars: 'D C G G D C G G' }],
  },
  {
    id: 'hotel-california',
    title: 'Hotel California',
    origin: `Eagles · ${NOTE}`,
    group: 'Рок',
    key: 'Bm',
    meter: 4,
    tempo: 74,
    sections: [
      { label: 'Куплет', bars: 'Bm F# A E G D Em F#' },
      { label: 'Припев', bars: 'G D F# Bm G D Em F#' },
    ],
  },
  {
    id: 'zombie',
    title: 'Zombie',
    origin: `The Cranberries · ${NOTE}`,
    group: 'Рок',
    key: 'Em',
    meter: 4,
    tempo: 84,
    sections: [{ label: 'Куплет и припев', bars: 'Em C G D Em C G D' }],
  },
  {
    id: 'johnny-b-goode',
    title: 'Johnny B. Goode',
    origin: `Chuck Berry · ${NOTE}: 12-тактовый рок-н-ролл (оригинал в B♭)`,
    group: 'Рок',
    key: 'A',
    meter: 4,
    tempo: 160,
    sections: [{ label: 'Квадрат', bars: 'A A A A D D A A E D A E' }],
  },

  // ---------------- Баллады и фолк ----------------
  {
    id: 'hallelujah',
    title: 'Hallelujah',
    origin: `Leonard Cohen · ${NOTE}`,
    group: 'Баллады и фолк',
    key: 'C',
    meter: 3,
    tempo: 60,
    sections: [
      { label: 'Куплет', bars: 'C Am C Am F G C G' },
      { label: 'Припев', bars: 'F Am F C G C' },
    ],
  },
  {
    id: 'country-roads',
    title: 'Take Me Home, Country Roads',
    origin: `John Denver · ${NOTE} (оригинал в A)`,
    group: 'Баллады и фолк',
    key: 'G',
    meter: 4,
    tempo: 82,
    sections: [
      { label: 'Куплет', bars: 'G Em D C G D C G' },
      { label: 'Припев', bars: 'G D Em C G D C G' },
    ],
  },
  {
    id: 'imagine',
    title: 'Imagine',
    origin: `John Lennon · ${NOTE}`,
    group: 'Баллады и фолк',
    key: 'C',
    meter: 4,
    tempo: 76,
    sections: [
      { label: 'Куплет', bars: 'C F C F C F C F' },
      { label: 'Переход', bars: 'F Am Dm F G G7' },
      { label: 'Припев', bars: 'F G C E7 F G C E7' },
    ],
  },
  {
    id: 'blowin',
    title: "Blowin' in the Wind",
    origin: `Bob Dylan · ${NOTE}`,
    group: 'Баллады и фолк',
    key: 'G',
    meter: 4,
    tempo: 88,
    sections: [
      { label: 'Куплет', bars: 'G C G G G C D D' },
      { label: 'Припев', bars: 'C D G Em C D G G' },
    ],
  },

  // ---------------- Джаз ----------------
  {
    id: 'autumn-leaves',
    title: 'Autumn Leaves',
    origin: `джазовый стандарт · ${NOTE}: ii–V–I в мажоре и миноре`,
    group: 'Джаз',
    key: 'Em',
    meter: 4,
    tempo: 110,
    sections: [
      { label: 'A', bars: 'Am7 D7 Gmaj7 Cmaj7 F#m7b5 B7 Em Em' },
      { label: 'B', bars: 'F#m7b5 B7 Em Em Am7 D7 Gmaj7 Gmaj7' },
    ],
  },
  {
    id: 'blue-bossa',
    title: 'Blue Bossa',
    origin: `Kenny Dorham · ${NOTE}: босса-нова`,
    group: 'Джаз',
    key: 'Cm',
    meter: 4,
    tempo: 140,
    sections: [
      { label: 'A', bars: 'Cm7 Cm7 Fm7 Fm7 Dm7b5 G7 Cm7 Cm7' },
      { label: 'B', bars: 'Ebm7 Ab7 Dbmaj7 Dbmaj7 Dm7b5 G7 Cm7 G7' },
    ],
  },

  // ---------------- Регги и латино ----------------
  {
    id: 'three-little-birds',
    title: 'Three Little Birds',
    origin: `Bob Marley · ${NOTE}`,
    group: 'Регги и латино',
    key: 'A',
    meter: 4,
    tempo: 74,
    sections: [
      { label: 'Припев', bars: 'A A D A A A E D' },
      { label: 'Куплет', bars: 'A E F#m D A E F#m D' },
    ],
  },
  {
    id: 'despacito',
    title: 'Despacito',
    origin: `Luis Fonsi · ${NOTE}`,
    group: 'Регги и латино',
    key: 'Bm',
    meter: 4,
    tempo: 89,
    sections: [{ label: 'Весь трек', bars: 'Bm G D A Bm G D A' }],
  },
  {
    id: 'la-bamba',
    title: 'La Bamba',
    origin: 'мексиканская народная · аккорды без слов',
    group: 'Регги и латино',
    key: 'C',
    meter: 4,
    tempo: 140,
    sections: [{ label: 'Весь трек', bars: 'C F G G C F G G' }],
  },
  {
    id: 'guantanamera',
    title: 'Guantanamera',
    origin: `кубинская песня · ${NOTE}`,
    group: 'Регги и латино',
    key: 'C',
    meter: 3,
    tempo: 100,
    sections: [{ label: 'Весь трек', bars: 'C F G G C F G G' }],
  },

  // ---------------- Кино ----------------
  {
    id: 'zvezda-solnce',
    title: 'Звезда по имени Солнце',
    origin: `Кино · ${NOTE}`,
    group: 'Кино',
    key: 'Am',
    meter: 4,
    tempo: 124,
    sections: [
      { label: 'Куплет', bars: 'Am C Dm G Am C Dm G' },
      { label: 'Припев', bars: 'Am C Dm G Am C Dm G' },
    ],
  },
  {
    id: 'gruppa-krovi',
    title: 'Группа крови',
    origin: `Кино · ${NOTE} (оригинал в F♯m)`,
    group: 'Кино',
    key: 'Am',
    meter: 4,
    tempo: 116,
    sections: [
      { label: 'Куплет', bars: 'Am Em Am G Am Em Am G' },
      { label: 'Припев', bars: 'Am Em Dm G Am Em Dm G' },
    ],
  },
  {
    id: 'kukushka',
    title: 'Кукушка',
    origin: `Кино · ${NOTE}`,
    group: 'Кино',
    key: 'Am',
    meter: 4,
    tempo: 120,
    sections: [
      { label: 'Вступление', bars: 'Am C G G' },
      { label: 'Куплет', bars: 'Am G Dm Am Am G Dm Am' },
      { label: 'Припев', bars: 'G F Am Am G F Am Am' },
    ],
  },
  {
    id: 'peremen',
    title: 'Перемен!',
    origin: `Кино · ${NOTE} (оригинал в F♯m)`,
    group: 'Кино',
    key: 'Em',
    meter: 4,
    tempo: 118,
    sections: [
      { label: 'Куплет', bars: 'Em G D Em Em G D Em' },
      { label: 'Припев', bars: 'Am G D Em Am G D Em' },
    ],
  },
  {
    id: 'pachka-sigaret',
    title: 'Пачка сигарет',
    origin: `Кино · ${NOTE}`,
    group: 'Кино',
    key: 'Em',
    meter: 4,
    tempo: 112,
    sections: [
      { label: 'Куплет', bars: 'Am C D Em Am C D Em' },
      { label: 'Припев', bars: 'Am C D Em Am C D Em' },
    ],
  },
  {
    id: 'spokojnaya-noch',
    title: 'Спокойная ночь',
    origin: `Кино · ${NOTE}`,
    group: 'Кино',
    key: 'Am',
    meter: 4,
    tempo: 96,
    sections: [
      { label: 'Вступление', bars: 'Am G Dm C' },
      { label: 'Куплет', bars: 'Am G Dm Am Am G Dm Am' },
      { label: 'Припев', bars: 'F Em Am Am F C Am Am' },
    ],
  },
  {
    id: 'vosmiklassnica',
    title: 'Восьмиклассница',
    origin: `Кино · ${NOTE}`,
    group: 'Кино',
    key: 'C',
    meter: 4,
    tempo: 132,
    sections: [
      { label: 'Куплет', bars: 'Am Em C G F G C C' },
      { label: 'Припев', bars: 'F G C Am F G C C' },
    ],
  },

  // ---------------- ДДТ ----------------
  {
    id: 'chto-takoe-osen',
    title: 'Что такое осень',
    origin: `ДДТ · ${NOTE}`,
    group: 'ДДТ',
    key: 'Am',
    meter: 4,
    tempo: 112,
    sections: [
      { label: 'Куплет', bars: 'Am E Am A7 Dm Dm E Am F Dm E Am A7' },
      { label: '', bars: 'Dm E Am F Dm E Am E' },
      { label: 'Припев', bars: 'Am F Dm E Am F Dm E Dm E Am F Dm E Am Am' },
    ],
  },
  {
    id: 'eto-vsyo',
    title: 'Это всё',
    origin: `ДДТ · ${NOTE}`,
    group: 'ДДТ',
    key: 'G',
    meter: 4,
    tempo: 76,
    sections: [
      { label: 'Куплет', bars: 'G D Em C D G D Em C D' },
      { label: 'Припев', bars: 'G D Em C G D C D' },
    ],
  },
  {
    id: 'veter',
    title: 'Ветер',
    origin: `ДДТ · ${NOTE}`,
    group: 'ДДТ',
    key: 'Em',
    meter: 4,
    tempo: 72,
    sections: [
      { label: 'Куплет', bars: 'Em D Em C Am D Em D Em C Am D' },
      { label: '', bars: 'Em C D Em C D Em C D Em C Am' },
      { label: 'Припев', bars: 'D G D Em C G D G C D G D Em C G D Em Em' },
    ],
  },

  // ---------------- Земфира ----------------
  {
    id: 'hochesh',
    title: 'Хочешь?',
    origin: `Земфира · ${NOTE}`,
    group: 'Земфира',
    key: 'Dm',
    meter: 4,
    tempo: 134,
    sections: [
      { label: 'Вступление', bars: 'Bb Dm Gm A' },
      { label: 'Куплет', bars: 'F Gm Am Am F Gm A A' },
      { label: 'Припев', bars: 'Dm Bb Gm F C C Dm Bb Gm F C C' },
    ],
  },
  {
    id: 'iskala',
    title: 'Искала',
    origin: `Земфира · ${NOTE}`,
    group: 'Земфира',
    key: 'Dm',
    meter: 4,
    tempo: 96,
    sections: [
      { label: 'Куплет', bars: 'Dm C G A Dm C G A Dm C G A Dm C G A' },
      { label: 'Припев', bars: 'F A F A F A G A' },
    ],
  },
  {
    id: 'romashki',
    title: 'Ромашки',
    origin: `Земфира · ${NOTE}`,
    group: 'Земфира',
    key: 'Dm',
    meter: 4,
    tempo: 120,
    sections: [
      { label: 'Куплет', bars: 'Dm G Am Am Dm G Am Am Dm G Am C Dm Dm E E' },
      { label: 'Припев', bars: 'A7 Dm G Am Dm G A A A7 Dm G Am Dm G A A' },
    ],
  },
  {
    id: 'arivederchi',
    title: 'Ариведерчи',
    origin: `Земфира · ${NOTE}`,
    group: 'Земфира',
    key: 'Am',
    meter: 4,
    tempo: 92,
    sections: [
      { label: 'Куплет', bars: 'Dm E Dm E Am F Dm E Am F Dm E' },
      { label: 'Припев', bars: 'F G C E F G C E F G C E Dm E Am Am' },
    ],
  },

  // ---------------- Русский рок и поп ----------------
  {
    id: 'rayony',
    title: 'Районы-кварталы',
    origin: `Звери · ${NOTE}`,
    group: 'Русский рок и поп',
    key: 'Am',
    meter: 4,
    tempo: 124,
    sections: [
      { label: 'Куплет', bars: 'Am F C G Am F C G' },
      { label: 'Припев', bars: 'Am F C G Am F C G' },
    ],
  },

  // ---------------- Бардовские и советские ----------------
  {
    id: 'izgib-gitary',
    title: 'Изгиб гитары жёлтой',
    origin: `Олег Митяев · ${NOTE}`,
    group: 'Бардовские и советские',
    key: 'Am',
    meter: 4,
    tempo: 96,
    sections: [
      { label: 'Куплет', bars: 'Am Dm G C F Dm E Am' },
      { label: 'Припев', bars: 'Am Dm G C F Dm E Am' },
    ],
  },
  {
    id: 'katyusha',
    title: 'Катюша',
    origin: `М. Блантер · ${NOTE}`,
    group: 'Бардовские и советские',
    key: 'Am',
    meter: 4,
    tempo: 120,
    sections: [
      { label: 'Куплет', bars: 'Am E Am Am Dm Am E Am' },
      { label: 'Повтор', bars: 'Am E Am Am Dm Am E Am' },
    ],
  },
  {
    id: 'podmoskovnye',
    title: 'Подмосковные вечера',
    origin: `В. Соловьёв-Седой · ${NOTE}`,
    group: 'Бардовские и советские',
    key: 'Am',
    meter: 4,
    tempo: 72,
    sections: [
      { label: 'Куплет', bars: 'Am Dm C Am Dm Am E Am' },
      { label: 'Повтор', bars: 'C G7 C Am Dm Am E Am' },
    ],
  },
  {
    id: 'kuznechik',
    title: 'В траве сидел кузнечик',
    origin: `В. Шаинский · ${NOTE}`,
    group: 'Бардовские и советские',
    key: 'C',
    meter: 4,
    tempo: 120,
    sections: [
      { label: 'Куплет', bars: 'C G7 G7 C C G7 G7 C' },
      { label: 'Припев', bars: 'F C G7 C F C G7 C' },
    ],
  },

  // ---------------- Народные ----------------
  {
    id: 'oy-moroz',
    title: 'Ой, мороз, мороз',
    origin: 'русская народная · аккорды без слов',
    group: 'Народные',
    key: 'Am',
    meter: 3,
    tempo: 76,
    sections: [
      { label: 'Куплет', bars: 'Am Dm Am E Am Dm E Am' },
    ],
  },
  {
    id: 'chorny-voron',
    title: 'Чёрный ворон',
    origin: 'русская народная · аккорды без слов',
    group: 'Народные',
    key: 'Am',
    meter: 4,
    tempo: 66,
    sections: [
      { label: 'Куплет', bars: 'Am Dm Am E Am Dm E Am' },
    ],
  },
  {
    id: 'oy-to-ne-vecher',
    title: 'Ой, то не вечер',
    origin: 'казачья народная · аккорды без слов',
    group: 'Народные',
    key: 'Am',
    meter: 4,
    tempo: 70,
    sections: [
      { label: 'Куплет', bars: 'Am Am Dm Am E E Am Am' },
    ],
  },

  // ---------------- Праздничные ----------------
  {
    id: 'jingle-bells',
    title: 'Jingle Bells (припев)',
    origin: 'Джеймс Пирпонт, 1857',
    group: 'Праздничные',
    key: 'C',
    meter: 4,
    tempo: 120,
    sections: [
      {
        label: '',
        bars: 'C C C C F C D7 G',
        words: ['Jingle bells,', 'jingle bells,', 'jingle all the', 'way!', 'Oh, what fun it', 'is to ride in a', 'one-horse open', 'sleigh!'],
      },
    ],
    melody: ['E4 E4 E4', 'E4 E4 E4', 'E4 G4 C4 D4', 'E4', 'F4 F4 F4 F4', 'F4 E4 E4 E4', 'E4 D4 D4 E4', 'D4 G4'],
    rhythm: ['1 1 2', '1 1 2', '1 1 1.5 0.5', '4', '1 1 1.5 0.5', '1 1 1 1', '1 1 1 1', '2 2'],
  },
];

// Fixed superset of hashtags shared by group listings and patient extraction.
// `fi`/`sv`/`en` are display labels; `stems` are only used by the mock extractor,
// the real extractor is prompted with the ids.
export const HASHTAGS = {
  yksinaisyys: { fi: 'Yksinäisyys', sv: 'Ensamhet', en: 'Loneliness', stems: ['yksinä', 'eristäytyn', 'ei ystäviä', 'vähän sosiaalisia kontakteja'] },
  masennus: { fi: 'Masennus', sv: 'Depression', en: 'Depression', stems: ['masenn', 'mielialan lasku', 'alakulo'] },
  ahdistus: { fi: 'Ahdistus', sv: 'Ångest', en: 'Anxiety', stems: ['ahdistu', 'ahdistun', 'huolestuneisuu'] },
  paniikkihairio: { fi: 'Paniikkihäiriö', sv: 'Paniksyndrom', en: 'Panic disorder', stems: ['paniik'] },
  sosiaalinenahdistus: { fi: 'Sosiaalinen ahdistus', sv: 'Social ångest', en: 'Social anxiety', stems: ['sosiaalisten tilanteiden jännit', 'sosiaalinen ahdistu', 'sosiaalista jännit'] },
  uni: { fi: 'Unihäiriöt', sv: 'Sömnproblem', en: 'Sleep problems', stems: ['unettom', 'univaike', 'unihäiri', 'nukahtamis', 'heräilee'] },
  suru: { fi: 'Suru', sv: 'Sorg', en: 'Grief', stems: ['suru', 'leskeksi', 'menehtyi', 'kuoleman jälkeen'] },
  stressi: { fi: 'Stressi', sv: 'Stress', en: 'Stress', stems: ['stress', 'kuormittu'] },
  uupumus: { fi: 'Uupumus', sv: 'Utmattning', en: 'Burnout', stems: ['uupu', 'loppuunpala', 'väsymy'] },
  traumat: { fi: 'Traumat', sv: 'Trauma', en: 'Trauma', stems: ['trauma', 'väkivaltaa', 'ptsd'] },
  tunnesaately: { fi: 'Tunnesäätely', sv: 'Emotionsreglering', en: 'Emotion regulation', stems: ['tunnesäätel', 'tunteiden säätel', 'impulsiiv', 'ärtyis'] },
  itsetunto: { fi: 'Itsetunto', sv: 'Självkänsla', en: 'Self-esteem', stems: ['itsetun', 'itsearvost', 'huono itsekuva'] },
  ikaantyneet: { fi: 'Ikääntyneet', sv: 'Äldre', en: 'Older adults', stems: [] },
  nuoret: { fi: 'Nuoret aikuiset', sv: 'Unga vuxna', en: 'Young adults', stems: [] },
  adhd: { fi: 'ADHD', sv: 'ADHD', en: 'ADHD', stems: ['adhd', 'add-'] },
  tyottomyys: { fi: 'Työttömyys', sv: 'Arbetslöshet', en: 'Unemployment', stems: ['työtön', 'työttömy', 'irtisano', 'lomautet'] },
  krooninenkipu: { fi: 'Krooninen kipu', sv: 'Kronisk smärta', en: 'Chronic pain', stems: ['krooninen kipu', 'kroonista kipua', 'pitkittynyt kipu', 'kipuoire', 'selkäkipu'] },
  ero: { fi: 'Ero', sv: 'Separation', en: 'Separation', stems: ['avioero', 'eronnut', 'parisuhteen päättym'] },
  vanhemmuus: { fi: 'Vanhemmuus', sv: 'Föräldraskap', en: 'Parenting', stems: ['vanhemmuu', 'lapsen hoito', 'synnytyksen jälkeinen'] },
  paihteet: { fi: 'Päihteet', sv: 'Rusmedel', en: 'Substance use', stems: ['päihde', 'alkoholin', 'humalahakui', 'kannabi'] },
} as const

export type HashtagId = keyof typeof HASHTAGS
export const HASHTAG_IDS = Object.keys(HASHTAGS) as HashtagId[]

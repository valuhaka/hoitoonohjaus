// Fixed superset of hashtags shared by group listings and patient extraction.
// `stems` are only used by the mock extractor; the real extractor is prompted with the ids.
export const HASHTAGS = {
  yksinaisyys: { fi: 'yksinäisyys', en: 'loneliness', stems: ['yksinä', 'eristäytyn', 'ei ystäviä', 'vähän sosiaalisia kontakteja'] },
  masennus: { fi: 'masennus', en: 'depression', stems: ['masenn', 'mielialan lasku', 'alakulo'] },
  ahdistus: { fi: 'ahdistus', en: 'anxiety', stems: ['ahdistu', 'ahdistun', 'huolestuneisuu'] },
  paniikkihairio: { fi: 'paniikkihäiriö', en: 'panic disorder', stems: ['paniik'] },
  sosiaalinenahdistus: { fi: 'sosiaalinenahdistus', en: 'social anxiety', stems: ['sosiaalisten tilanteiden jännit', 'sosiaalinen ahdistu', 'sosiaalista jännit'] },
  uni: { fi: 'unihäiriöt', en: 'sleep problems', stems: ['unettom', 'univaike', 'unihäiri', 'nukahtamis', 'heräilee'] },
  suru: { fi: 'suru', en: 'grief', stems: ['suru', 'leskeksi', 'menehtyi', 'kuoleman jälkeen'] },
  stressi: { fi: 'stressi', en: 'stress', stems: ['stress', 'kuormittu'] },
  uupumus: { fi: 'uupumus', en: 'burnout', stems: ['uupu', 'loppuunpala', 'väsymy'] },
  traumat: { fi: 'traumat', en: 'trauma', stems: ['trauma', 'väkivaltaa', 'ptsd'] },
  tunnesaately: { fi: 'tunnesäätely', en: 'emotion regulation', stems: ['tunnesäätel', 'tunteiden säätel', 'impulsiiv', 'ärtyis'] },
  itsetunto: { fi: 'itsetunto', en: 'self-esteem', stems: ['itsetun', 'itsearvost', 'huono itsekuva'] },
  ikaantyneet: { fi: 'ikääntyneet', en: 'older adults', stems: [] },
  nuoret: { fi: 'nuoretaikuiset', en: 'young adults', stems: [] },
  adhd: { fi: 'adhd', en: 'ADHD', stems: ['adhd', 'add-'] },
  tyottomyys: { fi: 'työttömyys', en: 'unemployment', stems: ['työtön', 'työttömy', 'irtisano', 'lomautet'] },
  krooninenkipu: { fi: 'krooninenkipu', en: 'chronic pain', stems: ['krooninen kipu', 'kroonista kipua', 'pitkittynyt kipu', 'kipuoire', 'selkäkipu'] },
  ero: { fi: 'eroelämässä', en: 'separation', stems: ['avioero', 'eronnut', 'parisuhteen päättym'] },
  vanhemmuus: { fi: 'vanhemmuus', en: 'parenting', stems: ['vanhemmuu', 'lapsen hoito', 'synnytyksen jälkeinen'] },
  paihteet: { fi: 'päihteet', en: 'substance use', stems: ['päihde', 'alkoholin', 'humalahakui', 'kannabi'] },
} as const

export type HashtagId = keyof typeof HASHTAGS
export const HASHTAG_IDS = Object.keys(HASHTAGS) as HashtagId[]

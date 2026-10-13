import type { Coords } from '../lib/geo'

// Registers the record entries come from. Kanta holds other providers' entries and needs the patient's consent.
export type RegisterId = 'primary' | 'mentalHealth' | 'specialist' | 'social' | 'school' | 'kanta'
export const REGISTER_IDS: RegisterId[] = ['primary', 'mentalHealth', 'specialist', 'social', 'school', 'kanta']

export type RecordEntry = {
  register: RegisterId
  date: string
  unit: string
  author: string
  text: string
}

export type Patient = {
  hetu: string
  lastName: string
  firstNames: string
  municipality: string
  homeCoords: Coords
  nonDisclosure: boolean
  language: 'fi' | 'sv'
  record: RecordEntry[]
  // Current social and health care contacts, drawn as a network on the map
  contacts: CareContact[]
}

export type CareContactKind = 'healthCentre' | 'mentalHealth' | 'specialist' | 'social' | 'school' | 'studentHealth'
export type CareContact = { kind: CareContactKind; name: string; coords: Coords }

// SYNTHETIC patients. HETUs use the 900–999 test range and are not real persons.
export const PATIENTS: Patient[] = [
  {
    hetu: '120358-912J',
    lastName: 'Virtanen',
    firstNames: 'Aino Maria',
    municipality: 'Lohja',
    homeCoords: { lat: 60.2128, lon: 23.9951 },
    nonDisclosure: false,
    language: 'fi',
    record: [
      {
        register: 'primary',
        date: '2026-09-18',
        unit: 'LUVN Lohjan terveysasema',
        author: 'psykologi',
        text: 'Puoliso menehtyi 2024, jäänyt leskeksi. Kokee voimakasta yksinäisyyttä, lapset asuvat ulkomailla. Lievää mielialan laskua, PHQ-9 8 p. Kognitio ikätasoinen (MMSE 29/30). Ei ulospäinsuuntautuvaa oireilua. Toivoo pääsevänsä ihmisten pariin.',
      },
      {
        register: 'primary',
        date: '2026-08-02',
        unit: 'LUVN Lohjan terveysasema',
        author: 'yleislääkäri',
        text: 'Verenpaine hoitotasolla. Kertoo nukkuvansa kohtalaisesti.',
      },
      {
        register: 'social',
        date: '2026-09-04',
        unit: 'LUVN Aikuissosiaalityö, Lohja',
        author: 'sosiaaliohjaaja',
        text: 'Liikkuu linja-autolla, oma auto puuttuu. Taloudellinen tilanne tiukka, eläke pieni. Haettu asumistukea.',
      },
      {
        register: 'kanta',
        date: '2025-03-11',
        unit: 'HUS Lohjan sairaala',
        author: 'ortopedi',
        text: 'Rannemurtuma kaatumisen jälkeen, parantunut hyvin.',
      },
    ],
    contacts: [
      { kind: 'healthCentre', name: 'LUVN Lohjan terveysasema', coords: { lat: 60.2556, lon: 24.0712 } },
      { kind: 'social', name: 'LUVN Aikuissosiaalityö, Lohja', coords: { lat: 60.2491, lon: 24.0598 } },
      { kind: 'specialist', name: 'HUS Lohjan sairaala', coords: { lat: 60.2594, lon: 24.0436 } },
    ],
  },
  {
    hetu: '040791-934U',
    lastName: 'Virtanen',
    firstNames: 'Aino Kaarina',
    municipality: 'Espoo',
    homeCoords: { lat: 60.205, lon: 24.655 },
    nonDisclosure: false,
    language: 'fi',
    record: [
      {
        register: 'mentalHealth',
        date: '2026-09-30',
        unit: 'LUVN Aikuisten mielenterveyspalvelut, Espoonlahti',
        author: 'psykiatrinen sairaanhoitaja',
        text: 'Taustalla vuosia kestänyttä lähisuhdeväkivaltaa, nyt turvassa. Takaumia ja voimakasta ahdistuneisuutta, nukahtamisvaikeuksia. Tunteiden säätely vaikeaa kuormittavissa tilanteissa. Työskentelee kokopäiväisesti kaupan alalla. Ei päihdeongelmaa.',
      },
    ],
    contacts: [
      { kind: 'mentalHealth', name: 'LUVN Aikuisten mielenterveyspalvelut, Espoonlahti', coords: { lat: 60.1503, lon: 24.6588 } },
      { kind: 'healthCentre', name: 'LUVN Kauklahden terveysasema', coords: { lat: 60.1932, lon: 24.5985 } },
      { kind: 'social', name: 'LUVN Sosiaalityö, Espoon keskus', coords: { lat: 60.2052, lon: 24.6561 } },
    ],
  },
  {
    hetu: '150301A9577',
    lastName: 'Lindqvist',
    firstNames: 'Mikael Johan',
    municipality: 'Espoo',
    homeCoords: { lat: 60.18, lon: 24.79 },
    nonDisclosure: false,
    language: 'sv',
    record: [
      {
        register: 'mentalHealth',
        date: '2026-10-01',
        unit: 'LUVN Nuorten aikuisten palvelut, Tapiola',
        author: 'psykologi',
        text: 'ADHD-diagnoosi 2019, lääkitys käytössä. Impulsiivisuutta ja ärtyisyyttä, sosiaalisten tilanteiden jännittämistä opinnoissa. Huono itsekuva, kokee epäonnistuvansa. Motivoitunut ryhmämuotoiseen hoitoon.',
      },
      {
        register: 'kanta',
        date: '2026-05-20',
        unit: 'YTHS Otaniemi',
        author: 'terveydenhoitaja',
        text: 'Opintojen eteneminen hidastunut. Nukkuu riittävästi.',
      },
    ],
    contacts: [
      { kind: 'mentalHealth', name: 'LUVN Nuorten aikuisten palvelut, Tapiola', coords: { lat: 60.1772, lon: 24.8051 } },
      { kind: 'school', name: 'Oppilaitos, Otaniemi', coords: { lat: 60.1867, lon: 24.8277 } },
      { kind: 'studentHealth', name: 'YTHS Otaniemi', coords: { lat: 60.1856, lon: 24.8325 } },
    ],
  },
  {
    hetu: '230679-921S',
    lastName: 'Korhonen',
    firstNames: 'Jari Tapani',
    municipality: 'Karkkila',
    homeCoords: { lat: 60.534, lon: 24.21 },
    nonDisclosure: false,
    language: 'fi',
    record: [
      {
        register: 'mentalHealth',
        date: '2026-09-25',
        unit: 'LUVN Karkkilan terveysasema',
        author: 'psykiatri',
        text: 'Irtisanottu keväällä 2026 tuotannollisista syistä. Työttömyys pitkittynyt, väsymystä ja uupumusta. Keskivaikea masennus, BDI 22. Heräilee öisin. Itsearvostus heikentynyt. Ei psykoottisia oireita.',
      },
    ],
    contacts: [
      { kind: 'mentalHealth', name: 'LUVN Karkkilan terveysasema, mielenterveyspalvelut', coords: { lat: 60.5371, lon: 24.2049 } },
      { kind: 'social', name: 'LUVN Aikuissosiaalityö, Karkkila', coords: { lat: 60.5329, lon: 24.2168 } },
      { kind: 'specialist', name: 'HUS Lohjan sairaala', coords: { lat: 60.2594, lon: 24.0436 } },
    ],
  },
  {
    hetu: '091188-946W',
    lastName: 'Nieminen',
    firstNames: 'Sanna Elina',
    municipality: 'Kirkkonummi',
    homeCoords: { lat: 60.123, lon: 24.438 },
    nonDisclosure: true,
    language: 'fi',
    record: [
      {
        register: 'primary',
        date: '2026-10-06',
        unit: 'LUVN Kirkkonummen terveysasema',
        author: 'psykologi',
        text: 'Toistuvia paniikkikohtauksia joukkoliikenteessä puolen vuoden ajan. Työstressi korkea, kokee kuormittuneisuutta. Yleistä ahdistuneisuutta. Somaattiset tutkimukset normaalit.',
      },
    ],
    contacts: [
      { kind: 'healthCentre', name: 'LUVN Kirkkonummen terveysasema', coords: { lat: 60.1225, lon: 24.4401 } },
    ],
  },
  {
    hetu: '280252-968A',
    lastName: 'Holm',
    firstNames: 'Erik Gunnar',
    municipality: 'Hanko',
    homeCoords: { lat: 59.823, lon: 22.968 },
    nonDisclosure: false,
    language: 'sv',
    record: [
      {
        register: 'specialist',
        date: '2026-09-12',
        unit: 'LUVN Kipupoliklinikka, Hanko',
        author: 'psykiatri',
        text: 'Krooninen selkäkipu vuodesta 2018. Kivun vuoksi univaikeuksia ja mielialan laskua. Toimintakyky kotona hyvä, liikkuu rollaattorilla. Toivoo ruotsinkielistä palvelua.',
      },
    ],
    contacts: [
      { kind: 'healthCentre', name: 'LUVN Hangon terveysasema', coords: { lat: 59.8262, lon: 22.9573 } },
      { kind: 'specialist', name: 'LUVN Kipupoliklinikka, Hanko', coords: { lat: 59.8291, lon: 22.9655 } },
      { kind: 'specialist', name: 'HUS Raaseporin sairaala', coords: { lat: 59.9763, lon: 23.4302 } },
    ],
  },
  {
    hetu: '140311A962A',
    lastName: 'Korhonen',
    firstNames: 'Emma Sofia',
    municipality: 'Karkkila',
    homeCoords: { lat: 60.534, lon: 24.21 },
    nonDisclosure: false,
    language: 'fi',
    record: [
      {
        register: 'school',
        date: '2026-09-22',
        unit: 'LUVN Kouluterveydenhuolto, Karkkila',
        author: 'terveydenhoitaja',
        text: 'Jännittää esiintymistä ja ryhmätilanteita koulussa, sosiaalisten tilanteiden jännittämistä. Vetäytynyt kavereista syksyn aikana ja kokee yksinäisyyttä. Itsetunto heikentynyt. Uni riittävää.',
      },
      {
        register: 'primary',
        date: '2026-08-15',
        unit: 'LUVN Karkkilan terveysasema',
        author: 'yleislääkäri',
        text: 'Vatsakipuja koulupäivien aamuisin, somaattiset tutkimukset normaalit.',
      },
    ],
    contacts: [
      { kind: 'school', name: 'Koulu (yläkoulu), Karkkila', coords: { lat: 60.5306, lon: 24.2187 } },
      { kind: 'healthCentre', name: 'LUVN Karkkilan terveysasema', coords: { lat: 60.5371, lon: 24.2049 } },
      { kind: 'mentalHealth', name: 'LUVN Perheneuvola, Lohja', coords: { lat: 60.2512, lon: 24.0689 } },
    ],
  },
]

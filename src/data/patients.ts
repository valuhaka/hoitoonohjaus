import type { Coords } from '../lib/geo'

export type RecordEntry = {
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
}

// SYNTHETIC patients. HETUs use the 900–999 test range and are not real persons.
export const PATIENTS: Patient[] = [
  {
    hetu: '120358-912J',
    lastName: 'Virtanen',
    firstNames: 'Aino Maria',
    municipality: 'Lohja',
    homeCoords: { lat: 60.249, lon: 24.065 },
    nonDisclosure: false,
    language: 'fi',
    record: [
      {
        date: '2026-09-18',
        unit: 'LUVN Lohjan terveysasema',
        author: 'psykologi',
        text: 'Puoliso menehtyi 2024, jäänyt leskeksi. Kokee voimakasta yksinäisyyttä, lapset asuvat ulkomailla. Lievää mielialan laskua, PHQ-9 8 p. Kognitio ikätasoinen (MMSE 29/30). Ei ulospäinsuuntautuvaa oireilua. Toivoo pääsevänsä ihmisten pariin. Liikkuu linja-autolla, oma auto puuttuu. Taloudellinen tilanne tiukka.',
      },
      {
        date: '2026-08-02',
        unit: 'LUVN Lohjan terveysasema',
        author: 'yleislääkäri',
        text: 'Verenpaine hoitotasolla. Kertoo nukkuvansa kohtalaisesti.',
      },
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
        date: '2026-09-30',
        unit: 'LUVN Aikuisten mielenterveyspalvelut, Espoonlahti',
        author: 'psykiatrinen sairaanhoitaja',
        text: 'Taustalla vuosia kestänyttä lähisuhdeväkivaltaa, nyt turvassa. Takaumia ja voimakasta ahdistuneisuutta, nukahtamisvaikeuksia. Tunteiden säätely vaikeaa kuormittavissa tilanteissa. Työskentelee kokopäiväisesti kaupan alalla. Ei päihdeongelmaa.',
      },
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
        date: '2026-10-01',
        unit: 'LUVN Nuorten aikuisten palvelut, Tapiola',
        author: 'psykologi',
        text: 'ADHD-diagnoosi 2019, lääkitys käytössä. Impulsiivisuutta ja ärtyisyyttä, sosiaalisten tilanteiden jännittämistä opinnoissa. Huono itsekuva, kokee epäonnistuvansa. Motivoitunut ryhmämuotoiseen hoitoon.',
      },
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
        date: '2026-09-25',
        unit: 'LUVN Karkkilan terveysasema',
        author: 'psykiatri',
        text: 'Irtisanottu keväällä 2026 tuotannollisista syistä. Työttömyys pitkittynyt, väsymystä ja uupumusta. Keskivaikea masennus, BDI 22. Heräilee öisin. Itsearvostus heikentynyt. Ei psykoottisia oireita.',
      },
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
        date: '2026-10-06',
        unit: 'LUVN Kirkkonummen terveysasema',
        author: 'psykologi',
        text: 'Toistuvia paniikkikohtauksia joukkoliikenteessä puolen vuoden ajan. Työstressi korkea, kokee kuormittuneisuutta. Yleistä ahdistuneisuutta. Somaattiset tutkimukset normaalit.',
      },
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
        date: '2026-09-12',
        unit: 'LUVN Kipupoliklinikka, Hanko',
        author: 'psykiatri',
        text: 'Krooninen selkäkipu vuodesta 2018. Kivun vuoksi univaikeuksia ja mielialan laskua. Toimintakyky kotona hyvä, liikkuu rollaattorilla. Toivoo ruotsinkielistä palvelua.',
      },
    ],
  },
]

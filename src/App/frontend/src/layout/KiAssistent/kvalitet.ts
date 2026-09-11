/**
 * Deterministiske signaler om en fritekstbeskrivelse.
 *
 * Vi vurderer ikke kvaliteten her - det gjør modellen. Men den skal gjøre det mot
 * noe etterprøvbart, ikke bare mot magefølelsen sin. Disse signalene sier hva som
 * målbart finnes i teksten, og så er det modellens jobb å utfordre på resten.
 */
export interface ISignaler {
  antallTegn: number;
  antallSetninger: number;
  omtalerOmraader: string[];
  manglerOmraader: string[];
  harKonkretSituasjon: boolean;
}

/**
 * Områdene en beskrivelse bør innom, med det som røper at de er nevnt.
 *
 * «ord» sammenlignes som hele ord, ikke som delstreng. Delstreng så riktig ut og
 * var det ikke: «plass» traff «holdeplassen», så enhver tekst om veien til bussen
 * ble regnet for også å handle om å være om bord. Da meldte signalene dekning der
 * det ikke var noen, og modellen sluttet å spørre om nettopp det som manglet.
 *
 * Derfor står bøyningsformene oppført. Det er mer skriving, men det er den eneste
 * måten å få «går» uten å få «gård».
 */
const OMRAADER: { navn: string; ord: string[]; uttrykk: string[] }[] = [
  {
    navn: 'veien til holdeplassen',
    ord: [
      'holdeplass',
      'holdeplassen',
      'bussholdeplass',
      'bussholdeplassen',
      'busstopp',
      'busstoppet',
      'stoppested',
      'stoppestedet',
      'gå',
      'går',
      'gikk',
      'gått',
      'gange',
      'gangen',
      'gangavstand',
      'hvile',
      'hviler',
      'hvilte',
      'pauser',
      'meter',
      'kvartal',
      'kvartaler',
    ],
    uttrykk: ['veien dit', 'fram til bussen', 'frem til bussen'],
  },
  {
    navn: 'å komme av og på bussen',
    ord: ['trinn', 'trinnet', 'trinnene', 'påstigning', 'avstigning', 'rampe', 'rampa', 'rampen', 'dørene'],
    uttrykk: ['på bussen', 'av bussen', 'om bord', 'stige på', 'stige av', 'komme meg inn', 'komme meg ut'],
  },
  {
    navn: 'å være om bord',
    ord: [
      'stå',
      'står',
      'sto',
      'stod',
      'stått',
      'sitte',
      'sitter',
      'satt',
      'sete',
      'setet',
      'sitteplass',
      'sitteplassen',
      'svimmel',
      'kvalm',
      'rykk',
      'rykker',
      'sving',
      'svinger',
      'bremser',
      'underveis',
      'turen',
    ],
    uttrykk: ['holde meg fast', 'om bord', 'på turen'],
  },
];

/** Uttrykk som tyder på at teksten forteller om noe som faktisk skjedde. */
const KONKRET = [
  'en gang',
  'sist',
  'i går',
  'forrige',
  'da jeg',
  'jeg måtte',
  'jeg klarte',
  'det skjedde',
  'pleier',
  'hver gang',
];

/** Deler teksten i ord. Unicode, fordi æ, ø og å ikke er med i \w. */
function ord(tekst: string): Set<string> {
  return new Set(
    tekst
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((o) => o.length > 0),
  );
}

export function finnSignaler(tekst: string): ISignaler {
  const t = (tekst ?? '').toLowerCase();
  const ordene = ord(t);
  const omtaler: string[] = [];
  const mangler: string[] = [];

  for (const o of OMRAADER) {
    const truffet = o.ord.some((x) => ordene.has(x)) || o.uttrykk.some((x) => t.includes(x));
    (truffet ? omtaler : mangler).push(o.navn);
  }

  return {
    antallTegn: tekst?.trim().length ?? 0,
    antallSetninger: (tekst ?? '').split(/[.!?]+/).filter((s) => s.trim().length > 3).length,
    omtalerOmraader: omtaler,
    manglerOmraader: mangler,
    harKonkretSituasjon: KONKRET.some((k) => t.includes(k)),
  };
}

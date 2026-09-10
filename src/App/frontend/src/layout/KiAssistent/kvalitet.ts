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

/** Områdene en beskrivelse bør innom, med ord som røper at de er nevnt. */
const OMRAADER: { navn: string; ord: string[] }[] = [
  {
    navn: 'veien til holdeplassen',
    ord: ['holdeplass', 'gå', 'gange', 'gangavstand', 'stopp', 'busstopp', 'hvile', 'meter'],
  },
  {
    navn: 'å komme av og på bussen',
    ord: ['på bussen', 'av bussen', 'stige', 'trinn', 'dør', 'påstigning', 'avstigning', 'komme meg om bord', 'om bord'],
  },
  {
    navn: 'å være om bord',
    ord: ['stå', 'sitte', 'sete', 'plass', 'svimmel', 'holde', 'rykk', 'sving', 'underveis', 'turen'],
  },
];

/** Ord som tyder på at teksten forteller om noe som faktisk skjedde. */
const KONKRET = ['en gang', 'sist', 'i går', 'forrige', 'da jeg', 'jeg måtte', 'jeg klarte', 'det skjedde', 'pleier'];

export function finnSignaler(tekst: string): ISignaler {
  const t = (tekst ?? '').toLowerCase();
  const omtaler: string[] = [];
  const mangler: string[] = [];

  for (const o of OMRAADER) {
    (o.ord.some((ord) => t.includes(ord)) ? omtaler : mangler).push(o.navn);
  }

  return {
    antallTegn: tekst?.trim().length ?? 0,
    antallSetninger: (tekst ?? '').split(/[.!?]+/).filter((s) => s.trim().length > 3).length,
    omtalerOmraader: omtaler,
    manglerOmraader: mangler,
    harKonkretSituasjon: KONKRET.some((k) => t.includes(k)),
  };
}

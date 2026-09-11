/**
 * Avgjør når vi skal be modellen si noe mer.
 *
 * Etter et verktøykall må vi si fra at den kan snakke videre, men nøyaktig én gang -
 * kaller den to verktøy i samme svar, gir to response.create overlappende tale. Vi må
 * altså vente til både svaret er ferdig OG alle verktøyene har levert.
 *
 * De to kan komme i hvilken som helst rekkefølge, og det er hele vanskeligheten:
 * hendelseslytteren er async, så en response.done kan behandles mens vi står og venter
 * på et verktøy. Derfor telles utestående verktøykall opp SYNKRONT, før ventingen - og
 * den som blir sist ferdig av de to er den som ber om nytt svar.
 *
 * Ligger her framfor inni WebRTC-oppkoblingen fordi feilen den fanger ikke handler om
 * nettverk, men om rekkefølgen på hendelser - og fordi den da kan testes for det.
 */
export interface ISvarflytOpsjoner {
  /** Sender response.create. */
  send: () => void;
  /**
   * Hvor lenge vi tror på at søkeren fortsatt snakker uten å ha hørt noe mer.
   *
   * Uten dette kan assistenten bli stum for godt: kommer det en speech_started som
   * aldri får sin speech_stopped - VAD-en bommer, mikrofonen forsvinner - står
   * flagget evig, og da ber vi aldri om nytt svar igjen.
   */
  taleTidsavbrudd?: number;
  settTidsavbrudd?: (fn: () => void, ms: number) => unknown;
  fjernTidsavbrudd?: (id: unknown) => void;
}

export interface ISvarflyt {
  verktoyStart: () => void;
  verktoySlutt: () => void;
  svarStartet: () => void;
  svarFerdigMottatt: () => void;
  taleStartet: () => void;
  taleStoppet: () => void;
  /** Første response.create, den som får modellen til å ta ordet. */
  aapne: () => void;
  avslutt: () => void;
}

export function lagSvarflyt(o: ISvarflytOpsjoner): ISvarflyt {
  const settTidsavbrudd =
    o.settTidsavbrudd ??
    ((fn: () => void, ms: number) => (typeof window === 'undefined' ? 0 : window.setTimeout(fn, ms)));
  const fjernTidsavbrudd =
    o.fjernTidsavbrudd ??
    ((id: unknown) => (typeof window === 'undefined' ? undefined : window.clearTimeout(id as number)));
  const taleTidsavbrudd = o.taleTidsavbrudd ?? 20000;

  let svarPaagaar = false;
  let utestaaendeVerktoy = 0;
  let svarFerdig = false;
  let skylderSvar = false;
  let soekerenSnakker = false;
  let taleVakt: unknown = null;

  const stoppVakt = () => {
    if (taleVakt !== null) {
      fjernTidsavbrudd(taleVakt);
      taleVakt = null;
    }
  };

  const beOmSvarNaarKlar = () => {
    // Snakker søkeren nå, lager tjenesten selv et svar når hen blir ferdig. Ber vi
    // om ett i tillegg, får vi to som snakker i munnen på hverandre.
    if (!skylderSvar || utestaaendeVerktoy > 0 || !svarFerdig || svarPaagaar || soekerenSnakker) {
      return;
    }
    skylderSvar = false;
    svarFerdig = false;
    svarPaagaar = true;
    o.send();
  };

  const taleStoppet = () => {
    stoppVakt();
    soekerenSnakker = false;
    beOmSvarNaarKlar();
  };

  return {
    verktoyStart: () => {
      // Begge disse må settes før vi venter på verktøyet. Gjør vi det etterpå, kan
      // response.done rekke å bli behandlet i mellomtiden, se at ingenting er
      // utestående, og la være å be om nytt svar - da blir assistenten stum.
      utestaaendeVerktoy += 1;
      skylderSvar = true;
    },
    verktoySlutt: () => {
      utestaaendeVerktoy -= 1;
      beOmSvarNaarKlar();
    },
    svarStartet: () => {
      svarPaagaar = true;
      // Nullstilles her, ikke bare når vi sender. Ellers henger flagget igjen fra
      // et tidligere svar og kan utløse et nytt på feil tidspunkt.
      svarFerdig = false;
      // Kommer det et svar, er søkerens tur over - uansett hva VAD-en rakk å si fra om.
      stoppVakt();
      soekerenSnakker = false;
    },
    svarFerdigMottatt: () => {
      svarPaagaar = false;
      svarFerdig = true;
      beOmSvarNaarKlar();
    },
    taleStartet: () => {
      soekerenSnakker = true;
      stoppVakt();
      taleVakt = settTidsavbrudd(taleStoppet, taleTidsavbrudd);
    },
    taleStoppet,
    aapne: () => {
      svarPaagaar = true;
      o.send();
    },
    avslutt: stoppVakt,
  };
}

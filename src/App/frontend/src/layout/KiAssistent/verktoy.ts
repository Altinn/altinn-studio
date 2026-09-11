/**
 * Lagringslogikken for KI-assistentens verktøy, som ren funksjon.
 *
 * Skilt ut fra komponenten fordi det er her modellen kan gjøre skade: den kan
 * bomme på felt-id, finne på koder som ikke finnes, eller prøve å «rette» noe
 * som kommer fra et register. Alt det skal avvises her, og kunne testes.
 */
export interface ISpoersmaalsfelt {
  id: string;
  sporsmaal?: string;
  alternativer?: { value: string; label: string }[];
  flervalg?: boolean;
  kunNaar?: string;
  /** Tegngrense fra layouten. Fritekst legges til, så uten den vokser teksten forbi det datamodellen tar imot. */
  maksLengde?: number;
  fritekst?: boolean;
}

/** Formatet en kontaktopplysning skal ha. Fritekst har ingen. */
export type IForhaandsformat = 'telefon' | 'epost';

export interface IForhaandsfelt {
  id: string;
  etikett?: string;
  kanRettes?: boolean;
  /** Hvor søkeren retter dette, når det ikke kan rettes her. Ulike felter, ulike registre. */
  rettesHos?: string;
  /**
   * Formatet verdien må ha. Uten det lagres alt assistenten mener den hørte.
   *
   * Telefonnummer og e-post er de eneste verdiene i skjemaet som verken kan utledes
   * av historien eller velges fra en liste - de kommer som en sifferrekke eller en
   * adresse over lyd, der talegjenkjenningen er svakest. Og de er de eneste feltene
   * ingenting validerte: datamodellen har dem som ren streng, så en feilhørt verdi
   * ble sendt inn uten at noen så det, på en søknad søkeren signerer.
   */
  format?: IForhaandsformat;
}

export interface IKontekstfelt {
  felt: string;
  sporsmaal: string;
  besvart: boolean;
  svar: string | null;
}

/**
 * En forhåndsutfylt opplysning, slik assistenten får den.
 *
 * «slikRettes» er poenget: får modellen bare «kanRettes: false», finner den på et
 * sted å sende folk - telefonoperatøren, for eksempel. Står handlingen i raden,
 * trenger den ikke gjette.
 */
export interface IOpplysning {
  felt: string;
  ledetekst: string;
  verdi: string;
  kanRettes: boolean;
  /** Bare når raden står alene. I en liste sier IKontekst.slikRetter det samme, én gang. */
  slikRettes?: string;
  rettesHos?: string;
  format?: IForhaandsformat;
  /** Satt når feltet er tomt og søkeren selv kan fylle det. Da skal det spørres om. */
  mangler?: boolean;
  spoerOmDenne?: boolean;
}

export interface IKontekst {
  besvart: IKontekstfelt[];
  gjenstaar: IKontekstfelt[];
  antallBesvart: number;
  antallGjenstaar: number;
  alleBesvart: boolean;
  /** Ledetekstene til kontaktopplysninger søkeren eier selv, som fortsatt er tomme. */
  manglerOpplysninger: string[];
  opplysninger: IOpplysning[];
  /**
   * Hva modellen gjør med en opplysning som er feil - sagt én gang for hele lista.
   *
   * Sto før på hver rad. Med åtte forhåndsutfylte felter ble det 582 tegn av samme
   * to setninger, sendt i åpningen av hver samtale, uten at den åttende gjentakelsen
   * sa modellen noe den ikke visste etter den første.
   */
  slikRetter: string;
}

export interface ILagreopsjoner {
  /** Det som allerede står i feltet. Brukes til å legge til i stedet for å overskrive. */
  naavaerende?: string;
  /** Sann bare når personen tar tilbake det hen sa før. Da skrives teksten om. */
  erstatt?: boolean;
}

export type ILagreresultat =
  | {
      nokkel: string;
      verdi: string;
      lagret: string;
      lagtTil?: boolean;
      fullt?: boolean;
      plassIgjen?: number;
      /** Verdien ble ryddet før lagring, for eksempel «krøllalfa» til @. */
      rettetOpp?: boolean;
      /** Står den her, skal verdien leses tilbake til personen. Beskjeden er med, så prompten slipper regelen. */
      bekreft?: string;
    }
  | {
      feil: string;
      gyldigeVerdier?: string[];
      brukIStedet?: string;
      rettesHos?: string;
      /** Det assistenten faktisk sendte inn. Uten det vet den ikke hva den bommet på. */
      oppfattet?: string;
      forventetFormat?: string;
      slikGaarDuFram?: string;
    };

/**
 * Klipper til tegngrensen, men ved siste setningsslutt framfor midt i et ord.
 *
 * En tekst som stopper i «jeg klarer ikke å» er verre enn en som er litt kortere:
 * det er søkeren som skriver under på den, og en halv setning ser ut som en feil
 * hen har gjort selv.
 */
function klipp(tekst: string, maks: number): string {
  if (tekst.length <= maks) {
    return tekst;
  }
  const kuttet = tekst.slice(0, maks);
  const slutt = Math.max(kuttet.lastIndexOf('. '), kuttet.lastIndexOf('.\n'), kuttet.lastIndexOf('! '));
  // Bare hvis det finnes en setningsslutt et stykke ut i teksten. Ellers kutter vi
  // hardt - en tom tekst hjelper ingen.
  return slutt > maks * 0.5 ? kuttet.slice(0, slutt + 1) : kuttet.trimEnd();
}

/**
 * Talte skilletegn, slik transkripsjonen skriver dem ned.
 *
 * Modellen hører aldri bokstaver - den får en norsk transkripsjon av det som ble
 * sagt. «krøllalfa» og «punkt» kommer derfor som ord, og en e-postadresse sagt høyt
 * blir «david krøllalfa impactit punkt no».
 *
 * Et bart «at» står ikke på lista, og skal ikke stå der: det er et av de vanligste
 * ordene i norsk, og ville gjort «jeg tror at det er riktig» til noe med en
 * krøllalfa i.
 */
const TALTE_TEGN: [RegExp, string][] = [
  [/\s*(krøllalfa|krollalfa|alfakrøll|snabel-?a|at-tegn)\s*/gi, '@'],
  [/\s*(punktum|punkt|dot)\s*/gi, '.'],
  [/\s*bindestrek\s*/gi, '-'],
  [/\s*(understrek|understreking|underscore)\s*/gi, '_'],
];

const FORMATKRAV: Record<IForhaandsformat, { moenster: RegExp; forventet: string; klage: string }> = {
  telefon: {
    // Åtte siffer i Norge, og landkode for dem som har et utenlandsk nummer.
    moenster: /^\+?\d{8,15}$/,
    forventet: '8 siffer, eller landkode og 8-15 siffer',
    klage: 'Dette ser ikke ut som et telefonnummer.',
  },
  epost: {
    moenster: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/,
    forventet: 'navn@domene.no',
    klage: 'Dette ser ikke ut som en e-postadresse.',
  },
};

/** Rydder en talt verdi til den formen skjemaet skal lagre. */
function normaliser(format: IForhaandsformat, raa: string): string {
  if (format === 'telefon') {
    return (
      raa
        .replace(/\s*(pluss|plus)\s*/gi, '+')
        .replace(/[\s\-().]/g, '')
        // «00» foran landkoden er samme nummer som «+». Vi lagrer én form av det.
        .replace(/^00/, '+')
    );
  }
  let t = raa.toLowerCase();
  for (const [uttrykk, tegn] of TALTE_TEGN) {
    t = t.replace(uttrykk, tegn);
  }
  // Transkripsjonen setter punktum til slutt fordi den hører en setning som slutter.
  return t.replace(/\s+/g, '').replace(/[.,;:]+$/, '');
}

/**
 * Tolker en talt kontaktopplysning, eller avviser den.
 *
 * Avvisningen sier hva assistenten sendte inn og hva den skal gjøre nå. Får den bare
 * «ugyldig» tilbake, prøver den samme feilhørte verdien igjen - eller går videre og
 * lar den stå tom.
 */
export function tolkKontakt(
  format: IForhaandsformat,
  raa: string,
):
  | { verdi: string; rettetOpp: boolean }
  | { feil: string; oppfattet: string; forventetFormat: string; slikGaarDuFram: string } {
  const krav = FORMATKRAV[format];
  const verdi = normaliser(format, raa.trim());
  if (!krav.moenster.test(verdi)) {
    return {
      feil: krav.klage,
      oppfattet: raa.trim(),
      forventetFormat: krav.forventet,
      slikGaarDuFram:
        format === 'telefon'
          ? 'Si sifrene du oppfattet, og be personen gjenta nummeret sifferrekke for sifferrekke. Lagre først når du har hele nummeret.'
          : 'Si adressen du oppfattet, og be personen stave den - navnet før @ og domenet etter. Lagre først når du har hele adressen.',
    };
  }
  return { verdi, rettetOpp: verdi !== raa.trim() };
}

export function lagreVerdi(
  feltId: string,
  raaVerdi: string,
  spoersmaal: ISpoersmaalsfelt[],
  forhaandsutfylt: IForhaandsfelt[],
  opsjoner?: ILagreopsjoner,
): ILagreresultat {
  const id = (feltId ?? '').trim();
  const verdi = (raaVerdi ?? '').trim();

  const spm = spoersmaal.find((f) => f.id === id);
  if (spm) {
    if (spm.alternativer?.length) {
      // Modellen skal ikke kunne finne på nye koder. Vi godtar bare det skjemaet
      // faktisk har, og sier fra med de gyldige så den kan prøve igjen.
      const gyldige = spm.alternativer.map((x) => x.value);
      const valgte = verdi
        .split(',')
        .map((v) => v.trim())
        .filter((v) => gyldige.includes(v));
      if (valgte.length === 0) {
        return { feil: 'Ugyldig verdi', gyldigeVerdier: gyldige };
      }
      const lagret = spm.flervalg ? valgte.join(',') : valgte[0];
      return { nokkel: id, verdi: lagret, lagret };
    }
    if (verdi.length === 0) {
      return { feil: 'Tomt svar' };
    }

    // Fritekst legges til, den skrives ikke over. Ber assistenten om mer, er svaret et
    // tillegg til historien - og en historie som forsvinner fordi modellen sendte inn
    // bare den siste setningen, er verre enn en som gjentar seg litt. Derfor er det
    // trygge valget standarden, og overskriving noe den må be om.
    //
    // Tegngrensen er datamodellens, ikke vår. Sprenger vi den, får søkeren en
    // valideringsfeil på innsending om en tekst assistenten skrev - og det er en
    // feil hen verken forstår eller kan rette.
    const maks = spm.maksLengde;
    const fra = (opsjoner?.naavaerende ?? '').trim();
    if (fra.length > 0 && !opsjoner?.erstatt) {
      if (fra.includes(verdi)) {
        // Modellen sendte inn hele historien på nytt. Da er det ikke noe nytt å legge til.
        return { nokkel: id, verdi: fra, lagret: fra };
      }
      const samlet = `${fra}\n\n${verdi}`;
      if (maks !== undefined && samlet.length > maks) {
        // Det som alt står er søkerens egne ord fra tidligere i samtalen. Vi kaster
        // dem ikke for å få plass til det siste - da ville historien blitt kortere av
        // at hen fortalte mer.
        const avkortet = klipp(samlet, maks);
        // Ble det ikke plass til noe av det nye, sier vi det rett ut. Å svare
        // «lagtTil» på en tekst som er uendret sender modellen videre i den tro at
        // svaret er notert, og da er det borte uten at noen vet det.
        if (avkortet.length <= fra.length) {
          return {
            feil:
              'Feltet er fullt. Be personen om å stryke eller korte ned noe før dere legger til mer, ' +
              'eller lagre en omskrevet og kortere versjon med erstatt=true.',
          };
        }
        return {
          nokkel: id,
          verdi: avkortet,
          lagret: avkortet,
          lagtTil: true,
          fullt: true,
          plassIgjen: 0,
        };
      }
      return {
        nokkel: id,
        verdi: samlet,
        lagret: samlet,
        lagtTil: true,
        ...(maks === undefined ? {} : { plassIgjen: maks - samlet.length }),
      };
    }
    const ny = maks === undefined ? verdi : klipp(verdi, maks);
    return {
      nokkel: id,
      verdi: ny,
      lagret: ny,
      ...(maks === undefined
        ? {}
        : { plassIgjen: maks - ny.length, ...(ny.length < verdi.length ? { fullt: true } : {}) }),
    };
  }

  // Kontaktinfo eier søkeren selv og kan rettes. Registerdata kan den ikke.
  const fu = forhaandsutfylt.find((f) => f.id === id);
  if (fu) {
    if (!fu.kanRettes) {
      // Hvilket register det er, står på feltet. Å gjette her ble feil: telefon og
      // e-post ligger ikke i Folkeregisteret, og søkeren ble sendt feil sted.
      return {
        feil: fu.rettesHos
          ? `Denne opplysningen kan ikke rettes her. Den rettes hos ${fu.rettesHos}.`
          : 'Denne opplysningen kan ikke rettes her.',
        rettesHos: fu.rettesHos,
        brukIStedet: 'meld_feil',
      };
    }
    if (verdi.length === 0) {
      return { feil: 'Tomt svar' };
    }
    if (fu.format) {
      const tolket = tolkKontakt(fu.format, verdi);
      if ('feil' in tolket) {
        return tolket;
      }
      return {
        nokkel: `fu_${id}`,
        verdi: tolket.verdi,
        lagret: tolket.verdi,
        ...(tolket.rettetOpp ? { rettetOpp: true } : {}),
        // Beskjeden ligger i svaret, ikke i prompten. Den gjelder bare her, og en
        // regel som kommer i det øyeblikket den gjelder, blir fulgt.
        bekreft: `Les «${tolket.verdi}» tilbake til personen og få det bekreftet. Er det feil, lagre på nytt.`,
      };
    }
    return { nokkel: `fu_${id}`, verdi, lagret: verdi };
  }

  return { feil: `Ukjent felt: ${id}` };
}

/**
 * Én forhåndsutfylt opplysning, ferdig til å leses opp og handles på.
 *
 * Lå før i komponenten, i verktøyet som leste opp opplysningene. Nå er det den ene
 * kilden: åpningen og restansen sier det samme om samme felt, fordi de spør samme
 * funksjon.
 */
export const SLIK_RETTER =
  'Står det rettesHos på raden, kan opplysningen ikke rettes her: noter det med meld_feil og si ' +
  'hvor den rettes. Ellers ber du om den riktige verdien og lagrer den med lagre.';

export function beskrivOpplysning(
  f: IForhaandsfelt,
  verdi: string,
  oversett: (tekstnokkel: string) => string,
  /** Sann når raden sendes alene, uten lista og forklaringen som hører til den. */
  alene = false,
): IOpplysning {
  const tom = verdi.trim().length === 0;
  return {
    felt: f.id,
    ledetekst: f.etikett ? oversett(f.etikett) : f.id,
    verdi,
    kanRettes: f.kanRettes ?? false,
    ...(alene
      ? {
          slikRettes: f.kanRettes
            ? 'Rettes her i skjemaet. Be om den riktige verdien og lagre den med lagre.'
            : f.rettesHos
              ? `Kan ikke rettes her. Rettes hos ${f.rettesHos}. Noter det med meld_feil.`
              : 'Kan ikke rettes her. Noter det med meld_feil.',
        }
      : {}),
    ...(f.kanRettes ? {} : { rettesHos: f.rettesHos }),
    ...(f.format ? { format: f.format } : {}),
    // Uten dette leser modellen opp et tomt felt og går videre. Den må vite at den
    // skal be om verdien, ikke bare konstatere at den mangler.
    ...(tom && f.kanRettes ? { mangler: true, spoerOmDenne: true } : {}),
  };
}

/** Er feltet aktuelt, gitt svarene så langt? Flervalg lagres kommaseparert. */
function erAktuelt(f: ISpoersmaalsfelt, les: (id: string) => string): boolean {
  if (!f.kunNaar) {
    return true;
  }
  const [id, verdi] = f.kunNaar.split('=');
  return les(id)
    .split(',')
    .map((v) => v.trim())
    .includes(verdi);
}

/** Gjør lagrede koder om til noe som kan leses høyt. */
function lesbart(f: ISpoersmaalsfelt, verdi: string, oversett: (n: string) => string): string {
  if (!f.alternativer?.length) {
    return verdi;
  }
  return verdi
    .split(',')
    .map((v) => v.trim())
    .map((v) => {
      const treff = f.alternativer?.find((a) => a.value === v);
      return treff ? oversett(treff.label) : v;
    })
    .join(', ');
}

/**
 * Hva assistenten allerede har, og hva som gjenstår.
 *
 * Skillet som betyr noe: modellen kan ha hørt et svar i samtalen uten å ha lagret
 * det. Denne sier hva som faktisk står i skjemaet, slik at den kan oppdage gapet
 * i stedet for å tro at noe er gjort.
 */
export function finnKontekst(
  spoersmaal: ISpoersmaalsfelt[],
  forhaandsutfylt: IForhaandsfelt[],
  les: (nokkel: string) => string,
  oversett: (tekstnokkel: string) => string,
): IKontekst {
  const besvart: IKontekstfelt[] = [];
  const gjenstaar: IKontekstfelt[] = [];

  for (const f of spoersmaal) {
    if (!erAktuelt(f, les)) {
      continue;
    }
    const verdi = les(f.id).trim();
    const rad: IKontekstfelt = {
      felt: f.id,
      sporsmaal: f.sporsmaal ? oversett(f.sporsmaal) : f.id,
      besvart: verdi.length > 0,
      svar: verdi.length > 0 ? lesbart(f, verdi, oversett) : null,
    };
    (rad.besvart ? besvart : gjenstaar).push(rad);
  }

  // Kontaktopplysninger søkeren eier selv er like obligatoriske som spørsmålene.
  // Holdes de utenfor, melder konteksten «alt besvart» om et skjema som ikke kan sendes.
  const manglerOpplysninger = forhaandsutfylt
    .filter((f) => f.kanRettes && les(`fu_${f.id}`).trim().length === 0)
    .map((f) => (f.etikett ? oversett(f.etikett) : f.id));

  return {
    besvart,
    gjenstaar,
    antallBesvart: besvart.length,
    antallGjenstaar: gjenstaar.length,
    alleBesvart: gjenstaar.length === 0 && manglerOpplysninger.length === 0,
    manglerOpplysninger,
    opplysninger: forhaandsutfylt.map((f) => beskrivOpplysning(f, les(`fu_${f.id}`), oversett)),
    slikRetter: SLIK_RETTER,
  };
}

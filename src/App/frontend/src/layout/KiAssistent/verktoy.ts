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

export interface IForhaandsfelt {
  id: string;
  etikett?: string;
  kanRettes?: boolean;
  /** Hvor søkeren retter dette, når det ikke kan rettes her. Ulike felter, ulike registre. */
  rettesHos?: string;
}

export interface IKontekstfelt {
  felt: string;
  sporsmaal: string;
  besvart: boolean;
  svar: string | null;
}

export interface IKontekst {
  besvart: IKontekstfelt[];
  gjenstaar: IKontekstfelt[];
  antallBesvart: number;
  antallGjenstaar: number;
  alleBesvart: boolean;
  /** Ledetekstene til kontaktopplysninger søkeren eier selv, som fortsatt er tomme. */
  manglerOpplysninger: string[];
  opplysninger: { felt: string; ledetekst: string; verdi: string; kanRettes: boolean }[];
}

export interface ILagreopsjoner {
  /** Det som allerede står i feltet. Brukes til å legge til i stedet for å overskrive. */
  naavaerende?: string;
  /** Sann bare når personen tar tilbake det hen sa før. Da skrives teksten om. */
  erstatt?: boolean;
}

export type ILagreresultat =
  | { nokkel: string; verdi: string; lagret: string; lagtTil?: boolean; fullt?: boolean; plassIgjen?: number }
  | { feil: string; gyldigeVerdier?: string[]; brukIStedet?: string; rettesHos?: string };

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
        brukIStedet: 'meld_feil_i_forhaandsutfylt',
      };
    }
    if (verdi.length === 0) {
      return { feil: 'Tomt svar' };
    }
    return { nokkel: `fu_${id}`, verdi, lagret: verdi };
  }

  return { feil: `Ukjent felt: ${id}` };
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
    opplysninger: forhaandsutfylt.map((f) => ({
      felt: f.id,
      ledetekst: f.etikett ? oversett(f.etikett) : f.id,
      verdi: les(`fu_${f.id}`),
      kanRettes: f.kanRettes ?? false,
    })),
  };
}

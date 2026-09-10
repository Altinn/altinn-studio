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
}

export interface IForhaandsfelt {
  id: string;
  etikett?: string;
  kanRettes?: boolean;
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
  opplysninger: { felt: string; ledetekst: string; verdi: string; kanRettes: boolean }[];
}

export type ILagreresultat =
  | { nokkel: string; verdi: string; lagret: string }
  | { feil: string; gyldigeVerdier?: string[]; brukIStedet?: string };

export function lagreVerdi(
  feltId: string,
  raaVerdi: string,
  spoersmaal: ISpoersmaalsfelt[],
  forhaandsutfylt: IForhaandsfelt[],
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
    return { nokkel: id, verdi, lagret: verdi };
  }

  // Kontaktinfo eier søkeren selv og kan rettes. Registerdata kan den ikke.
  const fu = forhaandsutfylt.find((f) => f.id === id);
  if (fu) {
    if (!fu.kanRettes) {
      return {
        feil: 'Denne opplysningen kommer fra Folkeregisteret og kan ikke rettes her.',
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

  return {
    besvart,
    gjenstaar,
    antallBesvart: besvart.length,
    antallGjenstaar: gjenstaar.length,
    alleBesvart: gjenstaar.length === 0,
    opplysninger: forhaandsutfylt.map((f) => ({
      felt: f.id,
      ledetekst: f.etikett ? oversett(f.etikett) : f.id,
      verdi: les(`fu_${f.id}`),
      kanRettes: f.kanRettes ?? false,
    })),
  };
}

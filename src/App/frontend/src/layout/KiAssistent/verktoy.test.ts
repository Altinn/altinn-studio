import { describe, expect, it } from 'vitest';

import { finnKontekst, lagreVerdi } from 'src/layout/KiAssistent/verktoy';

const spoersmaal = [
  { id: 'forklaring' },
  { id: 'blindRullestol', alternativer: [{ value: 'ja', label: 'a' }, { value: 'nei', label: 'b' }] },
  {
    id: 'funksjonsnedsettelser',
    flervalg: true,
    alternativer: [
      { value: 'bevegelse', label: 'a' },
      { value: 'hoersel', label: 'b' },
    ],
  },
];

const forhaandsutfylt = [
  { id: 'adresse', kanRettes: false },
  { id: 'foedselsnummer', kanRettes: false },
  { id: 'telefonnummer', kanRettes: true },
  { id: 'epost', kanRettes: true },
];

describe('lagreVerdi', () => {
  it('lagrer telefonnummer som kan rettes, med fu-nøkkelen', () => {
    expect(lagreVerdi('telefonnummer', '97106931', spoersmaal, forhaandsutfylt)).toEqual({
      nokkel: 'fu_telefonnummer',
      verdi: '97106931',
      lagret: '97106931',
    });
  });

  it('lagrer e-post som kan rettes', () => {
    expect(lagreVerdi('epost', ' ny@example.test ', spoersmaal, forhaandsutfylt)).toEqual({
      nokkel: 'fu_epost',
      verdi: 'ny@example.test',
      lagret: 'ny@example.test',
    });
  });

  it('nekter å rette registerdata, og peker på riktig verktøy', () => {
    const r = lagreVerdi('adresse', 'Ny gate 1', spoersmaal, forhaandsutfylt);
    expect(r).toHaveProperty('feil');
    expect(r).toHaveProperty('brukIStedet', 'meld_feil_i_forhaandsutfylt');
  });

  it('nekter å endre fødselsnummer', () => {
    expect(lagreVerdi('foedselsnummer', '01010112345', spoersmaal, forhaandsutfylt)).toHaveProperty('brukIStedet');
  });

  it('lagrer fritekst', () => {
    expect(lagreVerdi('forklaring', 'Jeg blir svimmel', spoersmaal, forhaandsutfylt)).toEqual({
      nokkel: 'forklaring',
      verdi: 'Jeg blir svimmel',
      lagret: 'Jeg blir svimmel',
    });
  });

  it('godtar bare koder skjemaet har', () => {
    expect(lagreVerdi('blindRullestol', 'kanskje', spoersmaal, forhaandsutfylt)).toEqual({
      feil: 'Ugyldig verdi',
      gyldigeVerdier: ['ja', 'nei'],
    });
  });

  it('tar flere koder ved flervalg, og kaster de ugyldige', () => {
    expect(lagreVerdi('funksjonsnedsettelser', 'bevegelse, oppdiktet, hoersel', spoersmaal, forhaandsutfylt)).toEqual({
      nokkel: 'funksjonsnedsettelser',
      verdi: 'bevegelse,hoersel',
      lagret: 'bevegelse,hoersel',
    });
  });

  it('tar bare første kode når det ikke er flervalg', () => {
    expect(lagreVerdi('blindRullestol', 'nei,ja', spoersmaal, forhaandsutfylt)).toEqual({
      nokkel: 'blindRullestol',
      verdi: 'nei',
      lagret: 'nei',
    });
  });

  it('avviser tomt svar', () => {
    expect(lagreVerdi('forklaring', '   ', spoersmaal, forhaandsutfylt)).toEqual({ feil: 'Tomt svar' });
  });

  it('avviser ukjent felt', () => {
    expect(lagreVerdi('finnesikke', 'x', spoersmaal, forhaandsutfylt)).toEqual({ feil: 'Ukjent felt: finnesikke' });
  });
});

describe('finnKontekst', () => {
  const spm = [
    { id: 'forklaring', sporsmaal: 'sp.forklaring' },
    {
      id: 'blindRullestol',
      sporsmaal: 'sp.blind',
      alternativer: [
        { value: 'ja', label: 'l.ja' },
        { value: 'nei', label: 'l.nei' },
      ],
    },
    {
      id: 'kategori',
      sporsmaal: 'sp.kategori',
      kunNaar: 'blindRullestol=ja',
      alternativer: [{ value: 'rullestolbruker', label: 'l.rullestol' }],
    },
    {
      id: 'funksjonsnedsettelser',
      sporsmaal: 'sp.funksjon',
      kunNaar: 'blindRullestol=nei',
      flervalg: true,
      alternativer: [
        { value: 'bevegelse', label: 'l.bevegelse' },
        { value: 'hoersel', label: 'l.hoersel' },
      ],
    },
  ];
  const fu = [{ id: 'adresse', etikett: 'l.adresse', kanRettes: false }];
  const oversett = (n: string) => ({
    'sp.forklaring': 'Hvorfor kan du ikke ta buss?',
    'sp.blind': 'Er du blind eller rullestolbruker?',
    'sp.kategori': 'Hva gjelder?',
    'sp.funksjon': 'Hva er nedsatt?',
    'l.ja': 'Ja',
    'l.nei': 'Nei',
    'l.rullestol': 'Rullestolbruker',
    'l.bevegelse': 'Nedsatt bevegelse',
    'l.hoersel': 'Nedsatt hørsel',
    'l.adresse': 'Adresse',
  })[n] ?? n;

  it('teller besvart og gjenstående, og hopper over det som ikke er aktuelt', () => {
    const data: Record<string, string> = { blindRullestol: 'nei', forklaring: '', funksjonsnedsettelser: '' };
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    // kategori er ikke aktuelt når svaret er nei
    expect(k.gjenstaar.map((g) => g.felt)).toEqual(['forklaring', 'funksjonsnedsettelser']);
    expect(k.antallBesvart).toBe(1);
    expect(k.alleBesvart).toBe(false);
  });

  it('leser koder tilbake som tekst som kan sies høyt', () => {
    const data: Record<string, string> = { blindRullestol: 'nei', funksjonsnedsettelser: 'bevegelse,hoersel' };
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    const rad = k.besvart.find((b) => b.felt === 'funksjonsnedsettelser');
    expect(rad?.svar).toBe('Nedsatt bevegelse, Nedsatt hørsel');
  });

  it('regner ja-ruten som ferdig uten spørsmål 2 og 3', () => {
    const data: Record<string, string> = {
      blindRullestol: 'ja',
      kategori: 'rullestolbruker',
      forklaring: 'Jeg bruker rullestol',
    };
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    expect(k.alleBesvart).toBe(true);
    expect(k.gjenstaar).toEqual([]);
  });

  it('tar med opplysningene og om de kan rettes', () => {
    const data: Record<string, string> = { fu_adresse: 'Storgata 3' };
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    expect(k.opplysninger).toEqual([
      { felt: 'adresse', ledetekst: 'Adresse', verdi: 'Storgata 3', kanRettes: false },
    ]);
  });
});

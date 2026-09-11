import { describe, expect, it } from 'vitest';

import { beskrivOpplysning, finnKontekst, lagreVerdi, tolkKontakt } from 'src/layout/KiAssistent/verktoy';
import type { IForhaandsfelt } from 'src/layout/KiAssistent/verktoy';

const spoersmaal = [
  { id: 'forklaring' },
  {
    id: 'blindRullestol',
    alternativer: [
      { value: 'ja', label: 'a' },
      { value: 'nei', label: 'b' },
    ],
  },
  {
    id: 'funksjonsnedsettelser',
    flervalg: true,
    alternativer: [
      { value: 'bevegelse', label: 'a' },
      { value: 'hoersel', label: 'b' },
    ],
  },
];

const forhaandsutfylt: IForhaandsfelt[] = [
  { id: 'adresse', kanRettes: false },
  { id: 'foedselsnummer', kanRettes: false },
  { id: 'telefonnummer', kanRettes: true, format: 'telefon' },
  { id: 'epost', kanRettes: true, format: 'epost' },
];

describe('lagreVerdi', () => {
  it('lagrer telefonnummer som kan rettes, med fu-nøkkelen', () => {
    expect(lagreVerdi('telefonnummer', '97106931', spoersmaal, forhaandsutfylt)).toMatchObject({
      nokkel: 'fu_telefonnummer',
      verdi: '97106931',
      lagret: '97106931',
    });
  });

  it('lagrer e-post som kan rettes', () => {
    expect(lagreVerdi('epost', ' ny@example.test ', spoersmaal, forhaandsutfylt)).toMatchObject({
      nokkel: 'fu_epost',
      verdi: 'ny@example.test',
      lagret: 'ny@example.test',
    });
  });

  it('ber om at kontaktverdien leses tilbake, uten at prompten må si det', () => {
    // Feilen dette fanger: instruksjonen sier at modellen ikke trenger bekreftelse på
    // hvert felt, og telefon og e-post er de to feltene der den trenger det.
    const r = lagreVerdi('telefonnummer', '97106931', spoersmaal, forhaandsutfylt);
    expect(r).toHaveProperty('bekreft', expect.stringContaining('97106931'));
  });

  it('nekter å rette registerdata, og peker på riktig verktøy', () => {
    const r = lagreVerdi('adresse', 'Ny gate 1', spoersmaal, forhaandsutfylt);
    expect(r).toHaveProperty('feil');
    expect(r).toHaveProperty('brukIStedet', 'meld_feil');
  });

  it('sier hvilket register feltet rettes hos, og navngir ikke noe annet', () => {
    // Feilen dette fanger: assistenten sendte folk til Folkeregisteret for å endre
    // telefonnummer. Stedet skal komme fra feltet, aldri fra en gjetning.
    const med = [{ id: 'adresse', kanRettes: false, rettesHos: 'Folkeregisteret' }];
    const r = lagreVerdi('adresse', 'Ny gate 1', spoersmaal, med);
    expect(r).toHaveProperty('rettesHos', 'Folkeregisteret');
    expect(r).toHaveProperty('feil', expect.stringContaining('Folkeregisteret'));
  });

  it('navngir ikke noe register når feltet ikke oppgir ett', () => {
    const r = lagreVerdi('adresse', 'Ny gate 1', spoersmaal, forhaandsutfylt);
    expect((r as { feil: string }).feil).not.toContain('Folkeregisteret');
    expect(r).toHaveProperty('rettesHos', undefined);
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

  it('legger til i fritekst i stedet for å overskrive det som alt er sagt', () => {
    // Feilen dette fanger: assistenten ba om mer, personen fortalte mer, og hele
    // historien ble byttet ut med den ene setningen.
    const r = lagreVerdi('forklaring', 'Jeg må hvile to ganger', spoersmaal, forhaandsutfylt, {
      naavaerende: 'Jeg blir svimmel',
    });
    expect(r).toEqual({
      nokkel: 'forklaring',
      verdi: 'Jeg blir svimmel\n\nJeg må hvile to ganger',
      lagret: 'Jeg blir svimmel\n\nJeg må hvile to ganger',
      lagtTil: true,
    });
  });

  it('overskriver fritekst bare når det bes om det', () => {
    const r = lagreVerdi('forklaring', 'Nei, sånn er det ikke', spoersmaal, forhaandsutfylt, {
      naavaerende: 'Jeg blir svimmel',
      erstatt: true,
    });
    expect(r).toEqual({
      nokkel: 'forklaring',
      verdi: 'Nei, sånn er det ikke',
      lagret: 'Nei, sånn er det ikke',
    });
  });

  it('gjentar ikke historien når modellen sender hele teksten på nytt', () => {
    const heleTeksten = 'Jeg blir svimmel og må hvile';
    const r = lagreVerdi('forklaring', 'Jeg blir svimmel', spoersmaal, forhaandsutfylt, {
      naavaerende: heleTeksten,
    });
    expect(r).toEqual({ nokkel: 'forklaring', verdi: heleTeksten, lagret: heleTeksten });
  });

  it('erstatter kontaktopplysninger, som er én verdi og ikke en fortelling', () => {
    const r = lagreVerdi('telefonnummer', '97106931', spoersmaal, forhaandsutfylt, {
      naavaerende: '11111111',
    });
    expect(r).toMatchObject({ nokkel: 'fu_telefonnummer', verdi: '97106931', lagret: '97106931' });
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
  const oversett = (n: string) =>
    ({
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

  it('er ikke ferdig når en kontaktopplysning søkeren eier selv mangler', () => {
    // Feilen dette fanger: skjemaet sa «vi har det vi trenger» mens telefonnummeret
    // var tomt, og assistenten sa seg ferdig med en søknad som ikke kunne sendes.
    const medKontakt = [
      { id: 'adresse', etikett: 'l.adresse', kanRettes: false },
      { id: 'telefonnummer', etikett: 'l.telefon', kanRettes: true },
    ];
    const data: Record<string, string> = {
      forklaring: 'Jeg blir svimmel',
      blindRullestol: 'ja',
      kategori: 'rullestolbruker',
    };
    const k = finnKontekst(spm, medKontakt, (n) => data[n] ?? '', oversett);
    expect(k.gjenstaar).toEqual([]);
    expect(k.manglerOpplysninger).toEqual(['l.telefon']);
    expect(k.alleBesvart).toBe(false);

    data.fu_telefonnummer = '97106931';
    expect(finnKontekst(spm, medKontakt, (n) => data[n] ?? '', oversett).alleBesvart).toBe(true);
  });

  it('krever ikke opplysninger søkeren ikke kan rette herfra', () => {
    const data: Record<string, string> = {
      forklaring: 'Jeg blir svimmel',
      blindRullestol: 'ja',
      kategori: 'rullestolbruker',
    };
    // Adresse er tom, men eies av et register - den skal ikke blokkere.
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    expect(k.manglerOpplysninger).toEqual([]);
    expect(k.alleBesvart).toBe(true);
  });

  it('tar med opplysningene, om de kan rettes, og hva modellen skal gjøre', () => {
    const data: Record<string, string> = { fu_adresse: 'Storgata 3' };
    const k = finnKontekst(spm, fu, (n) => data[n] ?? '', oversett);
    expect(k.opplysninger).toEqual([
      { felt: 'adresse', ledetekst: 'Adresse', verdi: 'Storgata 3', kanRettes: false, rettesHos: undefined },
    ]);
    // Handlingen står én gang for hele lista, ikke på hver av åtte rader.
    expect(k.slikRetter).toContain('meld_feil');
    expect(k.opplysninger[0].slikRettes).toBeUndefined();
  });
});

/**
 * Tegngrensen er datamodellens. Sprenger assistenten den, får søkeren en
 * valideringsfeil på innsending om en tekst assistenten selv skrev.
 */
describe('lagreVerdi med tegngrense', () => {
  const medGrense = [{ id: 'forklaring', maksLengde: 60 }];

  it('sier hvor mye plass som er igjen, så modellen kan disponere', () => {
    const r = lagreVerdi('forklaring', 'Jeg blir svimmel.', medGrense, []);
    expect(r).toEqual({
      nokkel: 'forklaring',
      verdi: 'Jeg blir svimmel.',
      lagret: 'Jeg blir svimmel.',
      plassIgjen: 43,
    });
  });

  it('lar teksten vokse så lenge det er plass', () => {
    const r = lagreVerdi('forklaring', 'Jeg må hvile.', medGrense, [], { naavaerende: 'Jeg blir svimmel.' });
    expect(r).toMatchObject({ lagtTil: true, plassIgjen: 28 });
  });

  it('klipper ved setningsslutt framfor midt i et ord', () => {
    const naavaerende = 'Jeg blir svimmel om bord. Jeg må holde meg fast hele turen.';
    const r = lagreVerdi('forklaring', 'Og jeg må hvile på veien dit.', medGrense, [], { naavaerende });
    // Her er det alt fullt, så modellen får beskjed framfor en halv setning.
    expect(r).toEqual({
      feil:
        'Feltet er fullt. Be personen om å stryke eller korte ned noe før dere legger til mer, ' +
        'eller lagre en omskrevet og kortere versjon med erstatt=true.',
    });
  });

  it('beholder det søkeren alt har sagt når det nye ikke får plass i sin helhet', () => {
    const stor = [{ id: 'forklaring', maksLengde: 50 }];
    const r = lagreVerdi('forklaring', 'Jeg må hvile to ganger på veien til holdeplassen.', stor, [], {
      naavaerende: 'Jeg er svimmel.',
    });
    expect(r).toMatchObject({ fullt: true, lagtTil: true, plassIgjen: 0 });
    // Det som sto der fra før er urørt - historien blir ikke kortere av at hen fortalte mer.
    expect('verdi' in r && r.verdi.startsWith('Jeg er svimmel.')).toBe(true);
    expect('verdi' in r && r.verdi.length <= 50).toBe(true);
  });

  it('klipper også en enkelt tekst som er for lang i seg selv', () => {
    const r = lagreVerdi('forklaring', 'a'.repeat(200), medGrense, []);
    expect('verdi' in r && r.verdi.length).toBe(60);
    expect(r).toMatchObject({ fullt: true, plassIgjen: 0 });
  });

  it('rører ikke felter uten grense', () => {
    const r = lagreVerdi('forklaring', 'a'.repeat(5000), [{ id: 'forklaring' }], []);
    expect('verdi' in r && r.verdi.length).toBe(5000);
    expect(r).not.toHaveProperty('plassIgjen');
  });
});

/**
 * Telefon og e-post er de eneste verdiene i skjemaet som verken kan velges fra en
 * liste eller utledes av historien: de dikteres over lyd, og modellen ser bare en
 * norsk transkripsjon av det som ble sagt. Datamodellen har dem som ren streng, så
 * det som slipper gjennom her, blir sendt inn på en søknad søkeren signerer.
 */
describe('tolkKontakt', () => {
  it('rydder et nummer som er sagt i grupper', () => {
    expect(tolkKontakt('telefon', '971 06 931')).toEqual({ verdi: '97106931', rettetOpp: true });
  });

  it('tar imot landkode, både som pluss og som 00', () => {
    expect(tolkKontakt('telefon', '+47 971 06 931')).toMatchObject({ verdi: '+4797106931' });
    expect(tolkKontakt('telefon', '0047 971 06 931')).toMatchObject({ verdi: '+4797106931' });
    expect(tolkKontakt('telefon', 'pluss 47 97106931')).toMatchObject({ verdi: '+4797106931' });
  });

  it('avviser et nummer med for få siffer, og sier hva modellen skal gjøre', () => {
    const r = tolkKontakt('telefon', '971 06');
    expect(r).toMatchObject({
      oppfattet: '971 06',
      forventetFormat: '8 siffer, eller landkode og 8-15 siffer',
    });
    expect(r).toHaveProperty('slikGaarDuFram', expect.stringContaining('gjenta'));
  });

  it('avviser en setning som er hørt som et nummer', () => {
    expect(tolkKontakt('telefon', 'jeg tror det er 971 06 931')).toHaveProperty('feil');
  });

  it('gjør talte skilletegn om til en e-postadresse', () => {
    expect(tolkKontakt('epost', 'David krøllalfa Impactit punkt no')).toEqual({
      verdi: 'david@impactit.no',
      rettetOpp: true,
    });
    expect(tolkKontakt('epost', 'david snabel-a impactit dot no')).toMatchObject({ verdi: 'david@impactit.no' });
  });

  it('tar punktumet transkripsjonen setter til slutt på en setning', () => {
    expect(tolkKontakt('epost', 'david@impactit.no.')).toMatchObject({ verdi: 'david@impactit.no' });
  });

  it('lar «at» være et vanlig norsk ord', () => {
    // Bart «at» på lista ville gjort «jeg tror at det er riktig» til en adresse.
    expect(tolkKontakt('epost', 'jeg tror at det er riktig')).toHaveProperty('feil');
  });

  it('avviser en adresse uten krøllalfa eller uten domene', () => {
    expect(tolkKontakt('epost', 'david impactit no')).toHaveProperty('feil');
    expect(tolkKontakt('epost', 'david@impactit')).toHaveProperty('feil');
  });

  it('fanger at verdiene er byttet om på feltene', () => {
    // Modellen kan kalle lagre med telefonnummeret i e-postfeltet. Ingenting
    // senere i kjeden ser forskjellen.
    expect(tolkKontakt('epost', '97106931')).toHaveProperty('feil');
    expect(tolkKontakt('telefon', 'david@impactit.no')).toHaveProperty('feil');
  });
});

describe('lagreVerdi med format', () => {
  it('lagrer den ryddede verdien, ikke det modellen sendte', () => {
    const r = lagreVerdi('epost', 'David Krøllalfa Impactit Punkt No', spoersmaal, forhaandsutfylt);
    expect(r).toMatchObject({ nokkel: 'fu_epost', verdi: 'david@impactit.no', rettetOpp: true });
  });

  it('avviser en feilhørt verdi i stedet for å lagre den', () => {
    const r = lagreVerdi('telefonnummer', 'nitti sju null seks', spoersmaal, forhaandsutfylt);
    expect(r).not.toHaveProperty('nokkel');
    expect(r).toHaveProperty('oppfattet', 'nitti sju null seks');
  });

  it('lar felter uten format være som før', () => {
    const utenFormat: IForhaandsfelt[] = [{ id: 'telefonnummer', kanRettes: true }];
    expect(lagreVerdi('telefonnummer', 'hva som helst', spoersmaal, utenFormat)).toEqual({
      nokkel: 'fu_telefonnummer',
      verdi: 'hva som helst',
      lagret: 'hva som helst',
    });
  });
});

describe('beskrivOpplysning', () => {
  const oversett = (n: string) => ({ 'l.telefon': 'Telefonnummer', 'l.adresse': 'Adresse' })[n] ?? n;

  it('sier at et tomt felt søkeren eier selv skal spørres om', () => {
    const r = beskrivOpplysning(
      { id: 'telefonnummer', etikett: 'l.telefon', kanRettes: true, format: 'telefon' },
      '',
      oversett,
    );
    expect(r).toMatchObject({ mangler: true, spoerOmDenne: true, format: 'telefon' });
  });

  it('tar veiledningen med bare når raden sendes alene', () => {
    // I lista sier IKontekst.slikRetter det samme én gang. Som spoerOm står raden
    // uten lista, og da er det ingen gjentakelse å spare.
    const f: IForhaandsfelt = { id: 'telefonnummer', etikett: 'l.telefon', kanRettes: true };
    expect(beskrivOpplysning(f, '', oversett).slikRettes).toBeUndefined();
    expect(beskrivOpplysning(f, '', oversett, true).slikRettes).toContain('lagre');
  });

  it('sender søkeren til registeret som står på feltet, og ikke noe annet sted', () => {
    const f: IForhaandsfelt = {
      id: 'adresse',
      etikett: 'l.adresse',
      kanRettes: false,
      rettesHos: 'Folkeregisteret',
    };
    expect(beskrivOpplysning(f, 'Storgata 3', oversett)).toMatchObject({ rettesHos: 'Folkeregisteret' });
    expect(beskrivOpplysning(f, 'Storgata 3', oversett, true).slikRettes).toContain('Folkeregisteret');
    expect(beskrivOpplysning(f, 'Storgata 3', oversett).mangler).toBeUndefined();
  });

  it('krever ikke at et tomt registerfelt fylles - søkeren kan ikke fylle det', () => {
    const r = beskrivOpplysning({ id: 'adresse', etikett: 'l.adresse', kanRettes: false }, '', oversett);
    expect(r.spoerOmDenne).toBeUndefined();
  });
});

import React from 'react';

import { Alert, Button, Paragraph } from '@digdir/designsystemet-react';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/KiAssistent/KiAssistent.module.css';
import { finnSignaler } from 'src/layout/KiAssistent/kvalitet';
import { erPaaSkjermen, markerFelt } from 'src/layout/KiAssistent/markering';
import { aapneOkt } from 'src/layout/KiAssistent/realtime';
import { beskrivOpplysning, finnKontekst, lagreVerdi } from 'src/layout/KiAssistent/verktoy';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOkt, IVerktoy } from 'src/layout/KiAssistent/realtime';

export type IKiAssistentProps = Readonly<PropsFromGenericComponent<'KiAssistent'>>;

export function KiAssistentComponent({ baseComponentId }: IKiAssistentProps) {
  const { langAsString } = useLanguage();
  const { felt, forhaandsutfylt, merknadBinding, sendKnappId, tokenUrl, sprak, transkripsjonsmodell, brukesBinding } =
    useItemWhenType(baseComponentId, 'KiAssistent');
  const debounce = FormStore.data.useDebounceImmediately();

  // Bygges dynamisk fra layouten, så nøklene er strenger - ikke en fast union.
  const bindinger = React.useMemo(() => {
    const ut: Record<string, IDataModelReference> = {};
    for (const f of felt) {
      ut[f.id] = f.binding;
    }
    for (const f of forhaandsutfylt ?? []) {
      ut[`fu_${f.id}`] = f.binding;
    }
    if (merknadBinding) {
      ut.merknad = merknadBinding;
    }
    if (brukesBinding) {
      ut.kiAssistert = brukesBinding;
    }
    return ut;
  }, [brukesBinding, felt, forhaandsutfylt, merknadBinding]);
  const { formData, setValue } = useDataModelBindings(bindinger);

  const [status, settStatus] = React.useState<'av' | 'starter' | 'i-gang'>('av');
  const [feil, settFeil] = React.useState<string | null>(null);
  const [sistSagt, settSistSagt] = React.useState<string | null>(null);
  const okt = React.useRef<IOkt | null>(null);
  const lyd = React.useRef<HTMLAudioElement | null>(null);

  /**
   * Hvor i samtalen vi er. Modellen har ingen hukommelse om det.
   *
   * Instruksjonen om å presentere seg gjelder like sterkt ved hvert svar vi ber om,
   * så etter et verktøykall kunne den hilse på nytt. Fasen holdes her og følger med
   * i hvert verktøysvar, slik at den ikke kan gjenåpne noe som alt er sagt.
   */
  const fase = React.useRef<'apning' | 'i-gang' | 'ferdig'>('apning');

  /**
   * Kvalitetsrundene på fritekstbeskrivelsen.
   *
   * «Høyst tre runder, aldri om det samme to ganger» var regler i prompten, til et
   * verktøy modellen selv måtte huske å kalle på rett tidspunkt. Nå er de her. En
   * regel modellen kan glemme, er ingen regel.
   */
  const kvalitet = React.useRef({ runder: 0, sistVurdert: '' });

  // Verktøyene leser og skriver gjeldende skjemadata. Ref-en gjør at modellen
  // aldri jobber mot en utdatert kopi når samtalen har vart en stund.
  const data = React.useRef(formData);
  data.current = formData;

  const les = React.useCallback(
    (nokkel: string) => (typeof data.current[nokkel] === 'string' ? (data.current[nokkel] as string) : ''),
    [],
  );

  /** Fritekstfeltet assistenten skal vurdere. Merket i layouten, ikke gjettet på her. */
  const fritekstfelt = React.useMemo(
    () => felt.find((f) => f.fritekst) ?? felt.find((f) => !f.alternativer?.length),
    [felt],
  );

  const aktuelleFelt = React.useCallback(
    () =>
      felt.filter((f) => {
        if (!f.kunNaar) {
          return true;
        }
        const [id, verdi] = f.kunNaar.split('=');
        // Flervalg lagres kommaseparert, så vi ser etter medlemskap - ikke likhet.
        return les(id)
          .split(',')
          .map((v) => v.trim())
          .includes(verdi);
      }),
    [felt, les],
  );

  const stopp = React.useCallback(() => {
    okt.current?.lukk();
    okt.current = null;
    fase.current = 'apning';
    kvalitet.current = { runder: 0, sistVurdert: '' };
    settStatus('av');
    // Markøren skrus av igjen. Den skjuler avkrysningene, og teksten over knappen
    // lover at man kan avslutte og fylle ut selv - blir den stående, er det løgn,
    // og søkeren sitter igjen med et skjema uten spørsmål.
    if (brukesBinding) {
      setValue('kiAssistert', '');
    }
    debounce('blur');
  }, [brukesBinding, debounce, setValue]);

  React.useEffect(() => () => okt.current?.lukk(), []);

  /** Lagrer ett felt og gir tilbake det modellen skal få vite. Delt av begge lagre-verktøyene. */
  const lagreEtt = React.useCallback(
    (feltId: string, raaVerdi: string, erstatt: boolean, alleredeSkrevet: Map<string, string>) => {
      const naavaerende = alleredeSkrevet.get(feltId) ?? les(feltId);
      const r = lagreVerdi(feltId, raaVerdi, felt, forhaandsutfylt ?? [], { naavaerende, erstatt });
      if (!('nokkel' in r)) {
        return { felt: feltId, ...r };
      }
      setValue(r.nokkel, r.verdi);
      // Flere felter i ett kall rekker ikke å se hverandres skriving via React.
      // Uten dette ville to påføyninger i samme kall overskrevet hverandre.
      alleredeSkrevet.set(feltId, r.verdi);
      return {
        felt: feltId,
        lagret: r.lagret,
        lagtTil: r.lagtTil === true,
        ...(r.fullt ? { fullt: true } : {}),
        ...(r.plassIgjen === undefined ? {} : { plassIgjen: r.plassIgjen }),
      };
    },
    [felt, forhaandsutfylt, les, setValue],
  );

  /**
   * Kvalitetsrunden på beskrivelsen, når det er en å ha.
   *
   * Var et eget verktøy modellen måtte kalle på rett tidspunkt. Nå avgjør koden når
   * det er noe å utfordre: bare når det står tekst der, bare på tekst vi ikke alt har
   * kommentert, og høyst tre ganger. Kallet har bivirkning - runden er brukt i det
   * den leveres, ellers ville samme tekst kunnet utfordres i det uendelige.
   */
  const nesteKvalitetsrunde = React.useCallback(() => {
    if (!fritekstfelt) {
      return undefined;
    }
    const tekst = les(fritekstfelt.id).trim();
    if (!tekst || tekst === kvalitet.current.sistVurdert || kvalitet.current.runder >= 3) {
      return undefined;
    }
    kvalitet.current = { runder: kvalitet.current.runder + 1, sistVurdert: tekst };
    return {
      felt: fritekstfelt.id,
      tekst,
      signaler: finnSignaler(tekst),
      // Kravene sendes bare i første runde. De er 548 tegn, de endrer seg ikke, og
      // i runde to står de alt i samtalen.
      ...(kvalitet.current.runder === 1 ? { krav: langAsString('kiassistent.kvalitetskrav') } : {}),
      veiledning:
        'Signalene sier hva som måles i teksten, ikke om den er god. Vurder selv, still ETT ' +
        'konkret oppfølgingsspørsmål om det viktigste som mangler, og lagre svaret. Vil personen ' +
        'ikke si mer, går du videre.',
    };
  }, [fritekstfelt, langAsString, les]);

  const verktoy = React.useMemo<IVerktoy[]>(
    () => [
      {
        name: 'start_samtale',
        description:
          'Alt du trenger for å åpne samtalen: opplysningene vi alt har om personen - med ' +
          'ledetekst, verdi og hva du gjør hvis noe er feil - og hva som er besvart og gjenstår. ' +
          'Kall denne først, og bare i åpningen.',
        parameters: { type: 'object', properties: {} },
        kjoer: () => {
          const k = finnKontekst(felt, forhaandsutfylt ?? [], les, langAsString);
          return {
            samtale: fase.current,
            ...(fase.current === 'apning'
              ? {}
              : { merk: 'Presentasjonen er alt sagt. Ikke hils på nytt - fortsett der dere er.' }),
            opplysninger: k.opplysninger,
            slikRetter: k.slikRetter,
            manglerOpplysninger: k.manglerOpplysninger,
            antallBesvart: k.antallBesvart,
            antallGjenstaar: k.antallGjenstaar,
            alleBesvart: k.alleBesvart,
          };
        },
      },
      {
        name: 'hva_gjenstaar',
        description:
          'Neste steg: feltene du skal fylle ut fra det personen har fortalt, det ene du ' +
          'eventuelt må spørre om, og om dere er ferdige. Kall denne etter hver lagring, og ' +
          'følg den til den svarer ferdig=true.',
        parameters: { type: 'object', properties: {} },
        kjoer: () => {
          // Er vi kommet hit, er presentasjonen sagt. Sies den igjen, er den feil.
          if (fase.current === 'apning') {
            fase.current = 'i-gang';
          }
          const tomt = (nokkel: string) => les(nokkel).trim().length === 0;
          const ubesvarte = aktuelleFelt().filter((f) => tomt(f.id));

          // Er feltet ikke på skjermen, er det en kategori søkeren aldri får se - den finnes
          // bare fordi kommunen trenger den. Slike felter skal fylles fra historien, og de
          // leveres samlet: ett verktøykall per felt var nettopp det som fikk samtalen til
          // å stampe.
          //
          // Spørringen har ingen bivirkning. Før markerte den hvert eneste felt den
          // sjekket, så siden hoppet rundt hver gang modellen spurte hva som gjensto.
          const beskrivelse = (f: (typeof ubesvarte)[number]) => ({
            felt: f.id,
            hva: langAsString(f.sporsmaal),
            alternativer: f.alternativer?.map((a) => ({ verdi: a.value, tekst: langAsString(a.label) })),
            flervalg: f.flervalg ?? false,
          });
          const synlig = new Map(ubesvarte.map((f) => [f.id, erPaaSkjermen(f.komponentId)]));
          // Fritekstfeltet er historien. Den spør vi alltid om, også om komponenten
          // skulle ligge i en kollapset seksjon - den kan ikke utledes av seg selv.
          const spoerFelt = ubesvarte.find((f) => f.id === fritekstfelt?.id) ?? ubesvarte.find((f) => synlig.get(f.id));
          const utled = ubesvarte.filter((f) => f.id !== spoerFelt?.id && !synlig.get(f.id));

          // Kontaktopplysninger søkeren eier selv teller også som ubesvart. Uten dette meldte
          // verktøyet «ferdig» mens telefonnummeret manglet.
          const kontakt = (forhaandsutfylt ?? []).find((f) => f.kanRettes && tomt(`fu_${f.id}`));

          if (!spoerFelt && utled.length === 0 && !kontakt) {
            // Rekkefølgen er kodens: feltene først, så kvaliteten på historien, så send
            // inn. Var kvalitetsrunden et eget verktøy, kom den når modellen husket den.
            const beskrivelsen = nesteKvalitetsrunde();
            if (beskrivelsen) {
              return { ferdig: false, samtale: 'i-gang', beskrivelsen };
            }
            fase.current = 'ferdig';
            // Markeringen av send-knappen gjøres her framfor i et eget verktøy: da kan
            // den ikke glemmes, og modellen kan uansett ikke trykke den.
            return {
              ferdig: true,
              samtale: 'ferdig',
              markertSendKnapp: markerFelt(sendKnappId),
              duKanIkkeSendeInn: true,
              beskjedTilPersonen:
                'Oppsummer kort hva som er fylt ut, si at du ikke kan sende inn for dem, og be ' +
                'dem se over og trykke «Send inn» selv. Ikke presenter deg på nytt.',
            };
          }

          // Markerer bare det ene feltet samtalen handler om nå, slik at søkeren ser
          // hvor dere er uten at siden flytter på seg av alt annet.
          if (spoerFelt) {
            markerFelt(spoerFelt.komponentId);
          } else if (kontakt) {
            markerFelt(kontakt.komponentId);
          }

          return {
            ferdig: false,
            samtale: 'i-gang',
            utledFraHistorien: utled.map(beskrivelse),
            spoerOm: spoerFelt
              ? { ...beskrivelse(spoerFelt), sporsmaal: langAsString(spoerFelt.sporsmaal) }
              : kontakt
                ? // Hele opplysningsraden, med format og slikRettes. Fikk modellen bare
                  // ledeteksten, ba den om «telefonnummeret» og godtok det første den
                  // hørte - og et feilhørt nummer er det ingenting som fanger senere.
                  beskrivOpplysning(kontakt, les(`fu_${kontakt.id}`), langAsString, true)
                : undefined,
            veiledning:
              (utled.length > 0
                ? 'Fyll ut alt i utledFraHistorien i ETT kall til lagre, ut fra det personen ' +
                  'alt har fortalt. Ikke spør om dem ett for ett - de vises ikke på skjermen. ' +
                  'Gir historien ikke svar på noen av dem, samler du dem i ett naturlig spørsmål. '
                : '') +
              (spoerFelt
                ? 'Still spørsmålet i spoerOm, og lagre svaret. Si ikke at dere er ferdige før det er på plass.'
                : kontakt
                  ? 'Be om opplysningen i spoerOm. Følg formatet, og les verdien tilbake før du går videre.'
                  : 'Kall hva_gjenstaar igjen når du har lagret, for å se om noe står igjen.'),
          };
        },
      },
      {
        name: 'lagre',
        description:
          'Lagrer ett eller flere svar - ett element i «svar» per felt. Alt du kan fylle ut ' +
          'fra det personen har fortalt tar du i samme kall. Har feltet alternativer, må ' +
          'verdien være en av dem du fikk, og flere verdier skilles med komma. I fritekstfelt ' +
          'legges svaret til det som står fra før - send bare det nye, ikke hele historien om ' +
          'igjen. De som går gjennom blir lagret selv om andre avvises.',
        parameters: {
          type: 'object',
          properties: {
            svar: {
              type: 'array',
              description: 'Ett element per felt du fyller ut.',
              items: {
                type: 'object',
                properties: {
                  felt: { type: 'string', description: 'Felt-id fra hva_gjenstaar' },
                  verdi: { type: 'string', description: 'Svaret' },
                  erstatt: {
                    type: 'boolean',
                    description:
                      'Bare når personen tar tilbake det hen sa før og vil ha teksten skrevet ' +
                      'om. Ellers utelates den, og teksten legges til.',
                  },
                },
                required: ['felt', 'verdi'],
              },
            },
          },
          required: ['svar'],
        },
        kjoer: (a) => {
          if (fase.current === 'apning') {
            fase.current = 'i-gang';
          }
          const rader = Array.isArray(a.svar)
            ? (a.svar as Record<string, unknown>[])
            : // Ett svar sendes av og til flatt, uten omslaget. Det er ikke verdt en
              // avvisning og en runde til - vi vet hva den mente.
              a.felt !== undefined
              ? [a]
              : [];
          if (rader.length === 0) {
            return { feil: 'Ingen svar å lagre. Send minst ett element i «svar».' };
          }
          const skrevet = new Map<string, string>();
          const resultater = rader.map((r) =>
            lagreEtt(String(r?.felt ?? ''), String(r?.verdi ?? ''), r?.erstatt === true, skrevet),
          );
          // Markerer det siste som gikk gjennom. Å rulle gjennom alle ville tatt
          // skjermen på en reise søkeren ikke ba om.
          const sisteOk = [...resultater].reverse().find((r) => 'lagret' in r);
          if (sisteOk) {
            const def =
              felt.find((f) => f.id === sisteOk.felt) ?? (forhaandsutfylt ?? []).find((f) => f.id === sisteOk.felt);
            markerFelt(def?.komponentId);
          }
          const avvist = resultater.filter((r) => 'feil' in r);
          return {
            resultater,
            antallLagret: resultater.length - avvist.length,
            samtale: 'i-gang',
            ...(avvist.length > 0
              ? { veiledning: 'Noen felter ble avvist. Gjør det avvisningen sier - resten er lagret.' }
              : {}),
          };
        },
      },
      {
        name: 'meld_feil',
        description:
          'Noterer at en forhåndsutfylt opplysning med kanRettes=false er feil. Den kan ikke ' +
          'rettes her, så notatet går til saksbehandleren.',
        parameters: {
          type: 'object',
          properties: {
            felt: { type: 'string', description: 'Felt-id fra start_samtale' },
            hvaSomErFeil: { type: 'string', description: 'Hva personen sier er riktig, med personens egne ord' },
          },
          required: ['felt', 'hvaSomErFeil'],
        },
        kjoer: (a) => {
          if (!merknadBinding) {
            return { feil: 'Skjemaet har ikke noe sted å notere dette.' };
          }
          const def = (forhaandsutfylt ?? []).find((f) => f.id === String(a.felt ?? ''));
          if (!def) {
            return { feil: `Ukjent felt: ${a.felt}` };
          }
          // Kan feltet rettes her, skal det rettes her. Å notere det til saksbehandleren
          // og sende personen videre er feil svar på noe skjemaet selv kan ordne.
          if (def.kanRettes) {
            return {
              feil: `${langAsString(def.etikett)} rettes her i skjemaet, ikke noe annet sted.`,
              brukIStedet: 'lagre',
            };
          }
          const notat = `${langAsString(def.etikett)}: ${String(a.hvaSomErFeil ?? '').trim()}`;
          const fra_foer = typeof data.current.merknad === 'string' ? data.current.merknad : '';
          // Legger til, aldri overskriver: flere opplysninger kan være feil.
          const samlet = fra_foer ? `${fra_foer}\n${notat}` : notat;
          if (samlet.length > 500) {
            // Heller si fra enn å klippe et notat på midten. Saksbehandleren skal
            // kunne stole på at det som står der, står der helt.
            return {
              feil: 'Det er ikke plass til flere merknader. Si at du har notert det du kunne, og gå videre.',
            };
          }
          setValue('merknad', samlet);
          return {
            notert: notat,
            rettesHos: def.rettesHos,
            // Stedet står på feltet. Si aldri et register modellen ikke har fått oppgitt.
            beskjedTilPersonen: def.rettesHos
              ? `Jeg har notert det i søknaden. Selve opplysningen må rettes hos ${def.rettesHos}.`
              : 'Jeg har notert det i søknaden. Selve opplysningen kan ikke rettes herfra.',
          };
        },
      },
    ],
    [
      aktuelleFelt,
      felt,
      forhaandsutfylt,
      fritekstfelt,
      lagreEtt,
      langAsString,
      les,
      merknadBinding,
      nesteKvalitetsrunde,
      sendKnappId,
      setValue,
    ],
  );

  const start = React.useCallback(async () => {
    settFeil(null);
    settStatus('starter');
    try {
      okt.current = await aapneOkt({
        tokenUrl: tokenUrl ?? 'api/v1/ki-assistent/token',
        instruksjon: langAsString('kiassistent.instruksjon'),
        sprak: sprak ?? 'no',
        transkripsjonsmodell: transkripsjonsmodell ?? 'gpt-4o-transcribe',
        verktoy,
        lydElement: lyd.current!,
        onStatus: (s) => settStatus(s === 'i-gang' ? 'i-gang' : 'starter'),
        onFeil: (m) => settFeil(m),
        onTale: (t) => settSistSagt(t),
      });
      // Settes først når samtalen faktisk står. Skjemaet skjuler avkrysningene på
      // denne markøren, så ble den satt før oppkoblingen, satt den igjen når
      // oppkoblingen feilet - og søkeren satt med et skjema uten spørsmål og ingen
      // vei tilbake. Modellen rekker ikke å fylle ut noe før dette er på plass.
      if (brukesBinding) {
        setValue('kiAssistert', 'true');
      }
    } catch (e) {
      okt.current = null;
      settFeil(e instanceof Error ? e.message : 'Ukjent feil');
      settStatus('av');
    }
  }, [brukesBinding, langAsString, setValue, sprak, tokenUrl, transkripsjonsmodell, verktoy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <audio
        ref={lyd}
        autoPlay
      />
      {/* Rammen står også mens samtalen går, slik at siden ikke hopper når den starter. */}
      <Alert data-color='info'>
        <span className={classes.tittel}>{langAsString('kiassistent.tittel')}</span>
        <div className={classes.innhold}>
          {status === 'av' ? (
            <Paragraph data-size='sm'>{langAsString('kiassistent.forklaring')}</Paragraph>
          ) : (
            <Paragraph
              data-size='sm'
              role='status'
            >
              {langAsString(status === 'starter' ? 'kiassistent.starter' : 'kiassistent.lytter')}
            </Paragraph>
          )}

          {sistSagt && status === 'i-gang' && (
            <Paragraph data-size='sm'>
              <em>{sistSagt}</em>
            </Paragraph>
          )}

          <div className={classes.handling}>
            <Button
              type='button'
              variant={status === 'av' ? 'primary' : 'secondary'}
              data-color={status === 'i-gang' ? 'danger' : undefined}
              onClick={status === 'av' ? start : stopp}
              disabled={status === 'starter'}
            >
              {langAsString(
                status === 'av'
                  ? 'kiassistent.start'
                  : status === 'starter'
                    ? 'kiassistent.starter'
                    : 'kiassistent.stopp',
              )}
            </Button>
          </div>
        </div>
      </Alert>

      {feil && (
        <Alert data-color='warning'>
          {langAsString('kiassistent.feil')} {feil}
        </Alert>
      )}
    </div>
  );
}

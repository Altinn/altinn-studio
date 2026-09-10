import React from 'react';

import { Alert, Button, Paragraph } from '@digdir/designsystemet-react';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { finnSignaler } from 'src/layout/KiAssistent/kvalitet';
import { markerFelt } from 'src/layout/KiAssistent/markering';
import { finnKontekst, lagreVerdi } from 'src/layout/KiAssistent/verktoy';
import { aapneOkt } from 'src/layout/KiAssistent/realtime';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IOkt, IVerktoy } from 'src/layout/KiAssistent/realtime';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export type IKiAssistentProps = Readonly<PropsFromGenericComponent<'KiAssistent'>>;

export function KiAssistentComponent({ baseComponentId }: IKiAssistentProps) {
  const { langAsString } = useLanguage();
  const {
    felt,
    forhaandsutfylt,
    merknadBinding,
    sendKnappId,
    tokenUrl,
    sprak,
    transkripsjonsmodell,
    stillhetMs,
    brukesBinding,
  } = useItemWhenType(
    baseComponentId,
    'KiAssistent',
  );
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

  // Verktøyene leser og skriver gjeldende skjemadata. Ref-en gjør at modellen
  // aldri jobber mot en utdatert kopi når samtalen har vart en stund.
  const data = React.useRef(formData);
  data.current = formData;

  const aktuelleFelt = React.useCallback(() => {
    const gjeldende = data.current;
    return felt.filter((f) => {
      if (!f.kunNaar) {
        return true;
      }
      const [id, verdi] = f.kunNaar.split('=');
      // Flervalg lagres kommaseparert, så vi ser etter medlemskap - ikke likhet.
      const lagret = typeof gjeldende[id] === 'string' ? (gjeldende[id] as string) : '';
      return lagret.split(',').map((v) => v.trim()).includes(verdi);
    });
  }, [felt]);

  const stopp = React.useCallback(() => {
    okt.current?.lukk();
    okt.current = null;
    settStatus('av');
    debounce('blur');
  }, [debounce]);

  React.useEffect(() => () => okt.current?.lukk(), []);

  const verktoy = React.useMemo<IVerktoy[]>(
    () => [
      {
        name: 'sjekk_kontekst',
        description:
          'Hva som allerede er fylt ut, og hva som gjenstår. Kall denne først.',
        parameters: { type: 'object', properties: {} },
        kjoer: () =>
          finnKontekst(
            felt,
            forhaandsutfylt ?? [],
            (n) => (typeof data.current[n] === 'string' ? (data.current[n] as string) : ''),
            langAsString,
          ),
      },
      {
        name: 'hent_neste_sporsmaal',
        description:
          'Neste spørsmål som mangler svar. Gir spørsmålet og eventuelle svaralternativer. ' +
          'Kall denne før hvert spørsmål du stiller.',
        parameters: { type: 'object', properties: {} },
        kjoer: () => {
          const neste = aktuelleFelt().find((f) => {
            const v = data.current[f.id];
            return !(typeof v === 'string' && v.trim().length > 0);
          });
          if (!neste) {
            return { ferdig: true, melding: 'Alle spørsmålene er besvart. Takk personen og avslutt.' };
          }
          // Søkeren skal se hvor vi er før spørsmålet stilles.
          const markert = markerFelt(neste.komponentId);
          return {
            felt: neste.id,
            markertPaaSkjermen: markert,
            sporsmaal: langAsString(neste.sporsmaal),
            alternativer: neste.alternativer?.map((a) => ({ verdi: a.value, tekst: langAsString(a.label) })),
            flervalg: neste.flervalg ?? false,
          };
        },
      },
      {
        name: 'lagre_svar',
        description:
          'Lagrer ett svar. Har feltet alternativer, må verdien være en av dem du fikk. ' +
          'Flere verdier skilles med komma.',
        parameters: {
          type: 'object',
          properties: {
            felt: { type: 'string', description: 'Felt-id fra hent_neste_sporsmaal' },
            verdi: { type: 'string', description: 'Svaret' },
          },
          required: ['felt', 'verdi'],
        },
        kjoer: (a) => {
          const r = lagreVerdi(String(a.felt ?? ''), String(a.verdi ?? ''), felt, forhaandsutfylt ?? []);
          if ('nokkel' in r) {
            setValue(r.nokkel, r.verdi);
            const def =
              felt.find((f) => f.id === r.nokkel) ??
              (forhaandsutfylt ?? []).find((f) => `fu_${f.id}` === r.nokkel);
            markerFelt(def?.komponentId);
            return { lagret: r.lagret };
          }
          return r;
        },
      },
      {
        name: 'les_opp_forhaandsutfylt',
        description:
          'Opplysningene vi allerede har om personen, med ledetekst og verdi.',
        parameters: { type: 'object', properties: {} },
        kjoer: () =>
          (forhaandsutfylt ?? []).map((f) => ({
            felt: f.id,
            ledetekst: langAsString(f.etikett),
            verdi: data.current[`fu_${f.id}`] ?? '',
            kanRettes: f.kanRettes ?? false,
          })),
      },
      {
        name: 'meld_feil_i_forhaandsutfylt',
        description:
          'Noterer at en opplysning med kanRettes=false er feil. Den kan ikke rettes her.',
        parameters: {
          type: 'object',
          properties: {
            felt: { type: 'string', description: 'Felt-id fra les_opp_forhaandsutfylt' },
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
          const notat = `${langAsString(def.etikett)}: ${String(a.hvaSomErFeil ?? '').trim()}`;
          const fra_foer = typeof data.current.merknad === 'string' ? data.current.merknad : '';
          // Legger til, aldri overskriver: flere opplysninger kan være feil.
          const samlet = fra_foer ? `${fra_foer}\n${notat}` : notat;
          setValue('merknad', samlet.slice(0, 500));
          return { notert: notat, beskjedTilPersonen: 'Dette må rettes hos Folkeregisteret. Jeg har notert det i søknaden.' };
        },
      },
      {
        name: 'vis_send_inn_knappen',
        description:
          'Markerer «Send inn»-knappen på skjermen. Du kan ikke sende inn selv.',
        parameters: { type: 'object', properties: {} },
        kjoer: () => {
          const markert = markerFelt(sendKnappId);
          return {
            markert,
            duKanIkkeSendeInn: true,
            beskjedTilPersonen:
              'Jeg kan ikke sende inn søknaden for deg. Se over det vi har fylt ut, og trykk «Send inn» når du er klar.',
          };
        },
      },
      {
        name: 'vurder_beskrivelse',
        description:
          'Fritekstbeskrivelsen med målbare signaler om hva den dekker, og kravene til en god ' +
          'beskrivelse. Kall denne etter at beskrivelsen er lagret.',
        parameters: { type: 'object', properties: {} },
        kjoer: () => {
          const tekst = typeof data.current.forklaring === 'string' ? (data.current.forklaring as string) : '';
          if (!tekst.trim()) {
            return { feil: 'Beskrivelsen er tom ennå.' };
          }
          return {
            tekst,
            signaler: finnSignaler(tekst),
            krav: langAsString('kiassistent.kvalitetskrav'),
            veiledning:
              'Signalene sier bare hva som måles i teksten, ikke om den er god. ' +
              'Vurder selv, og still ett konkret oppfølgingsspørsmål om det viktigste som mangler.',
          };
        },
      },
    ],
    [aktuelleFelt, felt, forhaandsutfylt, langAsString, merknadBinding, sendKnappId, setValue],
  );

  const start = React.useCallback(async () => {
    settFeil(null);
    settStatus('starter');
    // Markeres med en gang: skjemaet skjuler avkrysningene og omformulerer
    // spørsmålet ut fra dette, og det skal skje før assistenten begynner å fylle.
    if (brukesBinding) {
      setValue('kiAssistert', 'true');
    }
    try {
      okt.current = await aapneOkt({
        tokenUrl: tokenUrl ?? 'api/v1/ki-assistent/token',
        instruksjon: langAsString('kiassistent.instruksjon'),
        sprak: sprak ?? 'no',
        transkripsjonsmodell: transkripsjonsmodell ?? 'gpt-4o-transcribe',
        stillhetMs: stillhetMs ?? 4000,
        verktoy,
        lydElement: lyd.current!,
        onStatus: (s) => settStatus(s === 'i-gang' ? 'i-gang' : 'starter'),
        onFeil: (m) => settFeil(m),
        onTale: (t) => settSistSagt(t),
      });
    } catch (e) {
      settFeil(e instanceof Error ? e.message : 'Ukjent feil');
      settStatus('av');
    }
  }, [
    brukesBinding,
    langAsString,
    setValue,
    sprak,
    stillhetMs,
    tokenUrl,
    transkripsjonsmodell,
    verktoy,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <audio
        ref={lyd}
        autoPlay
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button
          type='button'
          variant={status === 'av' ? 'primary' : 'secondary'}
          data-color={status === 'i-gang' ? 'danger' : undefined}
          onClick={status === 'av' ? start : stopp}
          disabled={status === 'starter'}
        >
          {langAsString(
            status === 'av' ? 'kiassistent.start' : status === 'starter' ? 'kiassistent.starter' : 'kiassistent.stopp',
          )}
        </Button>
        {status === 'i-gang' && <span role='status'>{langAsString('kiassistent.lytter')}</span>}
      </div>

      {status === 'av' && <Paragraph data-size='sm'>{langAsString('kiassistent.forklaring')}</Paragraph>}

      {sistSagt && status === 'i-gang' && (
        <Paragraph data-size='sm'>
          <em>{sistSagt}</em>
        </Paragraph>
      )}

      {feil && (
        <Alert data-color='warning'>
          {langAsString('kiassistent.feil')} {feil}
        </Alert>
      )}
    </div>
  );
}

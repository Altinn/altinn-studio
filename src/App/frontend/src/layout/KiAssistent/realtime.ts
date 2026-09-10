/**
 * Oppkobling mot OpenAI Realtime over WebRTC.
 *
 * Den ekte API-nøkkelen er aldri her. Appen veksler den i et kortlevd token, og
 * det er tokenet som brukes til SDP-utvekslingen. Lyd går som mediespor, mens
 * hendelser og verktøykall går over datakanalen.
 */
export interface IVerktoy {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  kjoer: (argumenter: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface IOkt {
  lukk: () => void;
  sendHendelse: (hendelse: unknown) => void;
}

export interface IOktOpsjoner {
  tokenUrl: string;
  instruksjon: string;
  /** ISO-639-1, for eksempel «no». Gjør at talegjenkjenningen vet hva den hører. */
  sprak: string;
  transkripsjonsmodell: string;
  /** Hvor lenge det skal være stille før turen regnes som slutt. */
  stillhetMs: number;
  verktoy: IVerktoy[];
  lydElement: HTMLAudioElement;
  onStatus: (status: string) => void;
  onFeil: (melding: string) => void;
  onTale: (tekst: string) => void;
}

export async function aapneOkt(o: IOktOpsjoner): Promise<IOkt> {
  o.onStatus('henter-token');
  const tokenSvar = await fetch(o.tokenUrl, { method: 'POST' });
  if (!tokenSvar.ok) {
    throw new Error(`Fikk ikke token (${tokenSvar.status})`);
  }
  const tokenData = await tokenSvar.json();
  // Formen har variert mellom versjoner, så vi leter litt i stedet for å anta én.
  const noekkel: string | undefined =
    tokenData?.value ?? tokenData?.client_secret?.value ?? tokenData?.client_secret ?? tokenData?.secret;
  if (!noekkel) {
    throw new Error('Fant ingen nøkkel i tokensvaret');
  }

  o.onStatus('kobler-til');
  const pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    o.lydElement.srcObject = e.streams[0];
  };

  const mikrofon = await navigator.mediaDevices.getUserMedia({ audio: true });
  mikrofon.getTracks().forEach((t) => pc.addTrack(t, mikrofon));

  const kanal = pc.createDataChannel('oai-events');

  kanal.addEventListener('open', () => {
    // Verktøyene settes her, ikke på serveren: det er klienten som vet hvilke
    // felter skjemaet har akkurat nå.
    kanal.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: o.instruksjon,
          audio: {
            // Uten språkkoden gjetter gjenkjenningen, og norsk med dialekt er
            // nettopp der den gjetter feil.
            input: {
              transcription: { model: o.transkripsjonsmodell, language: o.sprak },
              // Vi rører ikke følsomheten. Verken støyreduksjon eller threshold
              // settes, så tjenesten bruker sine egne standardverdier for om
              // stemmen oppdages. Vi prøvde å skru dem, og resultatet var at den
              // ikke hørte folk som snakket inn i en maskinmikrofon.
              //
              // Det eneste vi styrer er hvor lenge den venter FØR den regner turen
              // som slutt. Det påvirker ikke om stemmen fanges opp, bare om noen
              // som tar en pause midt i en setning blir avbrutt.
              turn_detection: {
                type: 'server_vad',
                silence_duration_ms: o.stillhetMs,
              },
            },
          },
          tools: o.verktoy.map((v) => ({
            type: 'function',
            name: v.name,
            description: v.description,
            parameters: v.parameters,
          })),
        },
      }),
    );
    // Be modellen ta ordet først, slik at søkeren slipper å begynne.
    svarPaagaar = true;
    kanal.send(JSON.stringify({ type: 'response.create' }));
    o.onStatus('i-gang');
  });

  /*
   * Når skal vi be om et nytt svar?
   *
   * Etter et verktøykall må vi si fra at modellen kan snakke videre, men nøyaktig én
   * gang - kaller den to verktøy i samme svar, gir to response.create overlappende
   * tale. Vi må altså vente til både svaret er ferdig OG alle verktøyene har levert.
   *
   * De to kan komme i hvilken som helst rekkefølge, og det er hele vanskeligheten:
   * hendelseslytteren er async, så en response.done kan behandles mens vi står og
   * venter på et verktøy. Derfor telles utestående verktøykall opp SYNKRONT, før
   * ventingen - og den som blir sist ferdig av de to er den som ber om nytt svar.
   */
  let svarPaagaar = false;
  let utestaaendeVerktoy = 0;
  let svarFerdig = false;
  let skylderSvar = false;
  let soekerenSnakker = false;

  const beOmSvarNaarKlar = () => {
    // Snakker søkeren nå, lager tjenesten selv et svar når hen blir ferdig. Ber vi
    // om ett i tillegg, får vi to som snakker i munnen på hverandre.
    if (!skylderSvar || utestaaendeVerktoy > 0 || !svarFerdig || svarPaagaar || soekerenSnakker) {
      return;
    }
    skylderSvar = false;
    svarFerdig = false;
    svarPaagaar = true;
    kanal.send(JSON.stringify({ type: 'response.create' }));
  };

  kanal.addEventListener('message', async (e) => {
    let hendelse: { type?: string; [k: string]: unknown };
    try {
      hendelse = JSON.parse(e.data);
    } catch {
      return;
    }

    if (hendelse.type === 'response.function_call_arguments.done') {
      // Begge disse må settes før vi venter på verktøyet. Gjør vi det etterpå, kan
      // response.done rekke å bli behandlet i mellomtiden, se at ingenting er
      // utestående, og la være å be om nytt svar - da blir assistenten stum.
      utestaaendeVerktoy += 1;
      skylderSvar = true;

      const navn = hendelse.name as string;
      const kallId = hendelse.call_id as string;
      const verktoy = o.verktoy.find((v) => v.name === navn);
      let resultat: unknown;
      try {
        const argumenter = hendelse.arguments ? JSON.parse(hendelse.arguments as string) : {};
        resultat = verktoy ? await verktoy.kjoer(argumenter) : { feil: `Ukjent verktøy: ${navn}` };
      } catch (feil) {
        resultat = { feil: feil instanceof Error ? feil.message : 'Ukjent feil' };
      }
      kanal.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id: kallId, output: JSON.stringify(resultat) },
        }),
      );
      utestaaendeVerktoy -= 1;
      beOmSvarNaarKlar();
      return;
    }

    if (hendelse.type === 'response.done') {
      svarPaagaar = false;
      svarFerdig = true;
      beOmSvarNaarKlar();
      return;
    }

    if (hendelse.type === 'response.created') {
      svarPaagaar = true;
      // Nullstilles her, ikke bare når vi sender. Ellers henger flagget igjen fra
      // et tidligere svar og kan utløse et nytt på feil tidspunkt.
      svarFerdig = false;
      return;
    }

    if (hendelse.type === 'input_audio_buffer.speech_started') {
      soekerenSnakker = true;
      return;
    }

    if (hendelse.type === 'input_audio_buffer.speech_stopped') {
      soekerenSnakker = false;
      beOmSvarNaarKlar();
      return;
    }

    if (hendelse.type === 'response.output_audio_transcript.done' && typeof hendelse.transcript === 'string') {
      o.onTale(hendelse.transcript);
      return;
    }

    if (hendelse.type === 'error') {
      const feil = hendelse.error as { message?: string } | undefined;
      o.onFeil(feil?.message ?? 'Ukjent feil fra KI-tjenesten');
    }
  });

  const tilbud = await pc.createOffer();
  await pc.setLocalDescription(tilbud);

  const sdpSvar = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    body: tilbud.sdp,
    headers: { Authorization: `Bearer ${noekkel}`, 'Content-Type': 'application/sdp' },
  });
  if (!sdpSvar.ok) {
    pc.close();
    throw new Error(`SDP-utvekslingen feilet (${sdpSvar.status})`);
  }
  await pc.setRemoteDescription({ type: 'answer', sdp: await sdpSvar.text() });

  return {
    lukk: () => {
      mikrofon.getTracks().forEach((t) => t.stop());
      kanal.close();
      pc.close();
    },
    sendHendelse: (h) => kanal.send(JSON.stringify(h)),
  };
}

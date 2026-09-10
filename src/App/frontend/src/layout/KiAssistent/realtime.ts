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
  taledeteksjon: string;
  utaalmodighet: string;
  stillhetMs: number;
  stoyreduksjon: string;
  terskel: number;
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
              // Filtrerer lyden før taledeteksjonen, ikke etter. Det er dette som
              // hindrer at en dør som smeller eller noen som prater i bakgrunnen
              // blir oppfattet som at søkeren har begynt å snakke.
              noise_reduction: { type: o.stoyreduksjon },
              // Standard er et halvsekund stillhet. Det er altfor kort for noen som
              // snakker sakte eller har talevansker - og det er nettopp dem dette
              // skjemaet er til for. Vi lar heller assistenten vente for lenge.
              turn_detection:
                o.taledeteksjon === 'server_vad'
                  ? {
                      type: 'server_vad',
                      threshold: o.terskel,
                      silence_duration_ms: o.stillhetMs,
                      prefix_padding_ms: 600,
                    }
                  : { type: 'semantic_vad', eagerness: o.utaalmodighet },
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

  // Ett svar av gangen. Uten dette kan vi be om et nytt mens ett allerede er i gang,
  // og da hakker stemmen fordi to svar overlapper.
  let svarPaagaar = false;
  let venterPaaSvar = false;

  kanal.addEventListener('message', async (e) => {
    let hendelse: { type?: string; [k: string]: unknown };
    try {
      hendelse = JSON.parse(e.data);
    } catch {
      return;
    }

    if (hendelse.type === 'response.function_call_arguments.done') {
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
      // Vi ber ikke om nytt svar her. Kaller modellen flere verktøy i samme svar,
      // fyrer denne hendelsen én gang per kall - og ett response.create per kall
      // gir overlappende svar som stopper og starter. Vi venter på response.done
      // og ber om nøyaktig ett nytt svar der.
      venterPaaSvar = true;
      return;
    }

    if (hendelse.type === 'response.done') {
      svarPaagaar = false;
      if (venterPaaSvar) {
        venterPaaSvar = false;
        svarPaagaar = true;
        kanal.send(JSON.stringify({ type: 'response.create' }));
      }
      return;
    }

    if (hendelse.type === 'response.created') {
      svarPaagaar = true;
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

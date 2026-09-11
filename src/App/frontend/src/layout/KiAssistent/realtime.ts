import { lagSvarflyt } from 'src/layout/KiAssistent/svarflyt';
import { appPath } from 'src/utils/urls/appUrlHelper';

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
  verktoy: IVerktoy[];
  lydElement: HTMLAudioElement;
  onStatus: (status: string) => void;
  onFeil: (melding: string) => void;
  onTale: (tekst: string) => void;
}

/** Brukes bare hvis tokenendepunktet ikke sier hvor økten skal settes opp. */
const STANDARD_SDP_URL = 'https://api.openai.com/v1/realtime/calls';

/**
 * Gjør tokenUrl absolutt, målt fra approten.
 *
 * fetch() med en relativ sti måler fra dokumentet, ikke fra appen - og siden ligger
 * på /{org}/{app}/instance/{party}/{guid}/{task}/{side}. «api/v1/...» havnet derfor
 * under oppgaven og traff SPA-fallbacken, som svarer 200 med HTML. Da feilet ikke
 * kallet, det ga bare noe som ikke var JSON.
 */
export function tokenAdresse(tokenUrl: string): string {
  if (/^https?:\/\//i.test(tokenUrl)) {
    return tokenUrl;
  }
  return `${appPath}/${tokenUrl.replace(/^\/+/, '')}`;
}

export async function aapneOkt(o: IOktOpsjoner): Promise<IOkt> {
  o.onStatus('henter-token');
  const tokenSvar = await fetch(tokenAdresse(o.tokenUrl), {
    method: 'POST',
    // Endepunktet krever innlogget søker. Uten informasjonskapselen blir det 401.
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!tokenSvar.ok) {
    throw new Error(`Fikk ikke token (${tokenSvar.status})`);
  }

  let tokenData: Record<string, never>;
  try {
    tokenData = await tokenSvar.json();
  } catch {
    // Nesten alltid SPA-fallbacken som har svart med HTML. Si det, framfor å la
    // en JSON-parsefeil være det søkeren får se.
    throw new Error('Tokenendepunktet svarte ikke med JSON. Sjekk at tokenUrl peker på appen.');
  }

  // Formen har variert mellom versjoner, så vi leter litt i stedet for å anta én.
  const t = tokenData as Record<string, { value?: string } | string | undefined>;
  const hemmelighet = t.client_secret;
  const noekkel: string | undefined =
    (typeof t.value === 'string' ? t.value : undefined) ??
    (typeof hemmelighet === 'object' ? hemmelighet?.value : hemmelighet) ??
    (typeof t.secret === 'string' ? t.secret : undefined);
  if (!noekkel) {
    throw new Error('Fant ingen nøkkel i tokensvaret');
  }
  // Hvor økten settes opp bestemmes av den som eier nøkkelen, ikke av klienten.
  // Ellers går SDP-utvekslingen til OpenAI selv når appen er satt opp mot en proxy.
  const sdpUrl = typeof t.realtimeUrl === 'string' && t.realtimeUrl.length > 0 ? t.realtimeUrl : STANDARD_SDP_URL;

  o.onStatus('kobler-til');
  const pc = new RTCPeerConnection();
  let mikrofon: MediaStream | null = null;

  // Alt som er åpnet skal lukkes, også når oppkoblingen ryker halvveis. Uten dette
  // ble mikrofonen stående på etter en feilet start, med lampe og alt.
  const rydd = () => {
    mikrofon?.getTracks().forEach((t) => t.stop());
    pc.close();
  };

  try {
    pc.ontrack = (e) => {
      o.lydElement.srcObject = e.streams[0];
    };

    // Ekkokansellering og støyreduksjon bes om eksplisitt. Nettleseren slår dem
    // som regel på selv for «audio: true», men det er en standard vi ikke eier, og
    // den er svakest der den trengs mest: ekstern høyttaler og bluetooth-headset.
    // Uten dem lekker assistentens egen stemme inn i mikrofonen og avbryter den selv.
    mikrofon = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    mikrofon.getTracks().forEach((t) => pc.addTrack(t, mikrofon!));

    const kanal = pc.createDataChannel('oai-events');
    const flyt = lagSvarflyt({ send: () => kanal.send(JSON.stringify({ type: 'response.create' })) });

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
                // Uten dette kjører taledeteksjonen på standardterskel, og da holder
                // det at en kaffekopp settes ned: lyden blir regnet som tale, svaret
                // som pågår blir kuttet, og tjenesten lager et nytt svar på en
                // lydsnutt uten ord i. «low» sier at turen skal regnes som slutt
                // først når det faktisk er sagt noe ferdig.
                //
                // Barge-in står igjen på som standard: snakker søkeren mens assistenten
                // snakker, skal assistenten tie. Å slå det av ville gjort en kaffekopp
                // harmløs, men samtidig tatt fra søkeren muligheten til å avbryte - og
                // to stemmer oppå hverandre er verre enn en avbrytelse for mye.
                turn_detection: {
                  type: 'semantic_vad',
                  eagerness: 'low',
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
      flyt.aapne();
      o.onStatus('i-gang');
    });

    kanal.addEventListener('message', async (e) => {
      let hendelse: { type?: string; [k: string]: unknown };
      try {
        hendelse = JSON.parse(e.data);
      } catch {
        return;
      }

      if (hendelse.type === 'response.function_call_arguments.done') {
        flyt.verktoyStart();

        const navn = hendelse.name as string;
        const kallId = hendelse.call_id as string;
        const verktoy = o.verktoy.find((v) => v.name === navn);
        let resultat: unknown;
        try {
          const argumenter = hendelse.arguments ? JSON.parse(hendelse.arguments as string) : {};
          resultat = verktoy
            ? await verktoy.kjoer(argumenter)
            : {
                feil: `Ukjent verktøy: ${navn}`,
                tilgjengeligeVerktoy: o.verktoy.map((v) => v.name),
              };
        } catch (feil) {
          resultat = { feil: feil instanceof Error ? feil.message : 'Ukjent feil' };
        }
        kanal.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id: kallId, output: JSON.stringify(resultat) },
          }),
        );
        flyt.verktoySlutt();
        return;
      }

      if (hendelse.type === 'response.done') {
        flyt.svarFerdigMottatt();
        return;
      }

      if (hendelse.type === 'response.created') {
        flyt.svarStartet();
        return;
      }

      if (hendelse.type === 'input_audio_buffer.speech_started') {
        flyt.taleStartet();
        return;
      }

      if (hendelse.type === 'input_audio_buffer.speech_stopped' || hendelse.type === 'input_audio_buffer.committed') {
        flyt.taleStoppet();
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

    const sdpSvar = await fetch(sdpUrl, {
      method: 'POST',
      body: tilbud.sdp,
      headers: { Authorization: `Bearer ${noekkel}`, 'Content-Type': 'application/sdp' },
    });
    if (!sdpSvar.ok) {
      throw new Error(`SDP-utvekslingen feilet (${sdpSvar.status})`);
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: await sdpSvar.text() });

    return {
      lukk: () => {
        flyt.avslutt();
        kanal.close();
        rydd();
      },
      sendHendelse: (h) => kanal.send(JSON.stringify(h)),
    };
  } catch (feil) {
    rydd();
    throw feil;
  }
}

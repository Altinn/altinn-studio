/**
 * Nettleserens egen talegjenkjenning. Vi bruker den framfor opptak og transkribering
 * hos oss, fordi den virker uten backend. Merk at Chrome sender lyden til Google -
 * det er en avveining som må tas bevisst før dette går i produksjon.
 */
export interface ITalegjenkjenner {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: ITaleresultat) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export interface ITaleresultat {
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

export function hentTalegjenkjenning(): (new () => ITalegjenkjenner) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => ITalegjenkjenner;
    webkitSpeechRecognition?: new () => ITalegjenkjenner;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Finner alternativet som best matcher det som ble sagt.
 *
 * Talegjenkjenning gir sjelden ordrett treff - «rullator takk» skal treffe
 * «Rullator», og «under to hundre meter» skal treffe «Under 200 meter». Vi
 * normaliserer bort tegn og ser etter hele ord fra etiketten i det som ble sagt.
 * Treffer flere, returnerer vi ingenting heller enn å gjette feil.
 */
export function finnAlternativ(
  sagt: string,
  alternativer: { value: string; label: string }[],
): string | undefined {
  const normalisert = normaliser(sagt);
  if (!normalisert) {
    return undefined;
  }

  const treff = alternativer.filter((a) => {
    const ord = normaliser(a.label)
      .split(' ')
      .filter((o) => o.length > 2);
    if (ord.length === 0) {
      return false;
    }
    return ord.every((o) => normalisert.includes(o));
  });

  return treff.length === 1 ? treff[0].value : undefined;
}

function normaliser(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

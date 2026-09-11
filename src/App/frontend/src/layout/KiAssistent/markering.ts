import classes from 'src/layout/KiAssistent/markering.module.css';

/**
 * Finner komponenten i DOM-en, uten å røre den.
 *
 * Skilt fra markeringen fordi svaret brukes til to helt ulike ting: å markere noe
 * søkeren skal se, og å avgjøre om et felt i det hele tatt er synlig. Det siste
 * skal ikke rulle siden rundt - og gjorde det, fordi det var samme funksjon.
 */
export function finnFelt(komponentId: string | undefined): HTMLElement | null {
  if (!komponentId || typeof document === 'undefined') {
    return null;
  }
  const el = document.getElementById(komponentId) ?? document.querySelector(`[data-componentid="${komponentId}"]`);
  return el instanceof HTMLElement ? el : null;
}

/** Er feltet synlig for søkeren nå? Skjulte komponenter rendres ikke i det hele tatt. */
export function erPaaSkjermen(komponentId: string | undefined): boolean {
  return finnFelt(komponentId) !== null;
}

/**
 * Ruller til feltet assistenten jobber med, og markerer det kort.
 *
 * Poenget er at søkeren skal se hva som skjer mens de snakker - et skjema som
 * fylles ut usynlig er vanskeligere å stole på enn ett du ser bli fylt.
 *
 * Finner vi ikke elementet, gjør vi ingenting. Et felt kan være skjult eller ennå
 * ikke rendret, og en samtale skal ikke stoppe av at en markering ikke gikk.
 */
export function markerFelt(komponentId: string | undefined): boolean {
  const el = finnFelt(komponentId);
  if (!el) {
    return false;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove(classes.markert);
  // Tvinger fram en ny animasjon også når samme felt markeres to ganger på rad.
  void el.offsetWidth;
  el.classList.add(classes.markert);
  window.setTimeout(() => el.classList.remove(classes.markert), 2600);
  return true;
}

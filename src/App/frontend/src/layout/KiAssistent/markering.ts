import classes from 'src/layout/KiAssistent/markering.module.css';

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
  if (!komponentId || typeof document === 'undefined') {
    return false;
  }
  const el = document.getElementById(komponentId) ?? document.querySelector(`[data-componentid="${komponentId}"]`);
  if (!(el instanceof HTMLElement)) {
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

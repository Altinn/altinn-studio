import { describe, expect, it } from 'vitest';

import { lagSvarflyt } from 'src/layout/KiAssistent/svarflyt';

/**
 * Tester tilstandsmaskinen som avgjør når vi ber om nytt svar.
 *
 * Den testes direkte framfor gjennom WebRTC, fordi feilen den fanger ikke handler om
 * nettverk: det er rekkefølgen på hendelser fra datakanalen. En response.done som blir
 * behandlet mens vi står og venter på et verktøy, gjorde assistenten stum - og det er
 * ikke synlig ved å lese koden.
 *
 * Testen speilet tidligere logikken i en egen kopi. Kopien drev fra originalen og
 * hadde aldri med at søkeren snakker, som er nettopp der den andre stumhetsfeilen
 * satt. Nå kjøres koden som faktisk brukes.
 */
function lagFlyt(taleTidsavbrudd = 20000) {
  const sendt: string[] = [];
  const vakter = new Map<number, () => void>();
  let neste = 1;

  const flyt = lagSvarflyt({
    send: () => sendt.push('response.create'),
    taleTidsavbrudd,
    settTidsavbrudd: (fn) => {
      const id = neste++;
      vakter.set(id, fn);
      return id;
    },
    fjernTidsavbrudd: (id) => vakter.delete(id as number),
  });

  return {
    ...flyt,
    sendt,
    /** Lar tiden gå ut på vakten som eventuelt står. */
    utloepVakt: () => {
      const [id, fn] = [...vakter.entries()][0] ?? [];
      if (id !== undefined && fn) {
        vakter.delete(id);
        fn();
      }
    },
    antallVakter: () => vakter.size,
  };
}

describe('når vi ber om nytt svar', () => {
  it('ber om ett svar når verktøyet blir ferdig før response.done', () => {
    const f = lagFlyt();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarFerdigMottatt();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('ber om ett svar når response.done kommer mens verktøyet fortsatt kjører', () => {
    // Dette er tilfellet som gjorde assistenten stum: hendelsen kom inn mens
    // vi ventet på verktøyet.
    const f = lagFlyt();
    f.verktoyStart();
    f.svarFerdigMottatt();
    f.verktoySlutt();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('ber om nøyaktig ett svar når modellen kaller to verktøy i samme svar', () => {
    const f = lagFlyt();
    f.verktoyStart();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarFerdigMottatt();
    f.verktoySlutt();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('ber ikke om svar når modellen bare snakket, uten verktøykall', () => {
    const f = lagFlyt();
    f.svarStartet();
    f.svarFerdigMottatt();
    expect(f.sendt).toEqual([]);
  });

  it('ber ikke om nytt svar mens ett allerede er i gang', () => {
    const f = lagFlyt();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarStartet();
    f.svarFerdigMottatt();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('håndterer to runder etter hverandre uten å henge seg opp', () => {
    const f = lagFlyt();
    for (let i = 0; i < 2; i++) {
      f.verktoyStart();
      f.svarFerdigMottatt();
      f.verktoySlutt();
      f.svarStartet();
    }
    expect(f.sendt).toEqual(['response.create', 'response.create']);
  });

  it('sender det første svaret når samtalen åpner', () => {
    const f = lagFlyt();
    f.aapne();
    expect(f.sendt).toEqual(['response.create']);
  });
});

describe('når søkeren snakker', () => {
  it('venter i stedet for å snakke i munnen på hen', () => {
    const f = lagFlyt();
    f.taleStartet();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarFerdigMottatt();
    expect(f.sendt).toEqual([]);
  });

  it('tar ordet så snart hen er ferdig', () => {
    const f = lagFlyt();
    f.taleStartet();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarFerdigMottatt();
    f.taleStoppet();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('blir ikke stum for godt når det aldri kommer beskjed om at hen sluttet', () => {
    // Uten vakten står flagget evig, og assistenten svarer aldri igjen.
    const f = lagFlyt();
    f.taleStartet();
    f.verktoyStart();
    f.verktoySlutt();
    f.svarFerdigMottatt();
    expect(f.sendt).toEqual([]);

    f.utloepVakt();
    expect(f.sendt).toEqual(['response.create']);
  });

  it('lar et svar fra tjenesten avslutte turen, også uten speech_stopped', () => {
    const f = lagFlyt();
    f.verktoyStart();
    f.verktoySlutt();
    f.taleStartet();
    // Tjenesten laget selv et svar - da er søkerens tur over.
    f.svarStartet();
    f.svarFerdigMottatt();
    expect(f.antallVakter()).toBe(0);
  });

  it('rydder vakten når samtalen avsluttes', () => {
    const f = lagFlyt();
    f.taleStartet();
    expect(f.antallVakter()).toBe(1);
    f.avslutt();
    expect(f.antallVakter()).toBe(0);
  });
});

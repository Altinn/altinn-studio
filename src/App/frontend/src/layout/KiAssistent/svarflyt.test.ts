import { describe, expect, it } from 'vitest';

/**
 * Speiler tilstandsmaskinen i realtime.ts som avgjør når vi ber om nytt svar.
 *
 * Den er skilt ut som test framfor å testes gjennom WebRTC, fordi feilen den fanger
 * ikke handler om nettverk: det er rekkefølgen på hendelser fra datakanalen. En
 * response.done som blir behandlet mens vi står og venter på et verktøy, gjorde
 * assistenten stum - og det er ikke synlig ved å lese koden.
 */
function lagFlyt() {
  const sendt: string[] = [];
  let svarPaagaar = false;
  let utestaaendeVerktoy = 0;
  let svarFerdig = false;
  let skylderSvar = false;

  const beOmSvarNaarKlar = () => {
    if (!skylderSvar || utestaaendeVerktoy > 0 || !svarFerdig || svarPaagaar) {
      return;
    }
    skylderSvar = false;
    svarFerdig = false;
    svarPaagaar = true;
    sendt.push('response.create');
  };

  return {
    sendt,
    verktoyStart: () => {
      utestaaendeVerktoy += 1;
      skylderSvar = true;
    },
    verktoySlutt: () => {
      utestaaendeVerktoy -= 1;
      beOmSvarNaarKlar();
    },
    svarFerdigMottatt: () => {
      svarPaagaar = false;
      svarFerdig = true;
      beOmSvarNaarKlar();
    },
    svarStartet: () => {
      svarPaagaar = true;
    },
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
});

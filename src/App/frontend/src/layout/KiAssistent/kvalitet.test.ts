import { describe, expect, it } from 'vitest';

import { finnSignaler } from 'src/layout/KiAssistent/kvalitet';

/**
 * Signalene styrer hva assistenten utfordrer søkeren på. Melder de dekning der det
 * ikke er noen, slutter den å spørre om nettopp det som mangler - og beskrivelsen
 * saksbehandleren får, blir tynnere enn den trengte å bli.
 */
describe('finnSignaler', () => {
  it('regner ikke en tekst om veien til bussen som en tekst om å være om bord', () => {
    // Delstrengmatching gjorde dette feil: «plass» traff «holdeplassen».
    const s = finnSignaler('Jeg må hvile to ganger på veien til holdeplassen.');
    expect(s.omtalerOmraader).toEqual(['veien til holdeplassen']);
    expect(s.manglerOmraader).toEqual(['å komme av og på bussen', 'å være om bord']);
  });

  it('lar ikke «forstår» telle som at man står om bord', () => {
    const s = finnSignaler('Jeg forstår ikke alltid hva sjåføren sier.');
    expect(s.manglerOmraader).toContain('å være om bord');
  });

  it('lar ikke «gården» telle som at man går', () => {
    const s = finnSignaler('Jeg bor på en gård utenfor sentrum.');
    expect(s.manglerOmraader).toContain('veien til holdeplassen');
  });

  it('kjenner igjen bøyningsformer av det samme ordet', () => {
    expect(finnSignaler('Jeg går sakte.').omtalerOmraader).toContain('veien til holdeplassen');
    expect(finnSignaler('Jeg gikk hjem.').omtalerOmraader).toContain('veien til holdeplassen');
    expect(finnSignaler('Jeg står ustøtt.').omtalerOmraader).toContain('å være om bord');
  });

  it('kjenner igjen uttrykk som går over flere ord', () => {
    const s = finnSignaler('Jeg trenger hjelp for å komme meg om bord.');
    expect(s.omtalerOmraader).toContain('å komme av og på bussen');
  });

  it('ser at teksten forteller om noe som faktisk skjedde', () => {
    expect(finnSignaler('Forrige uke gikk bussen fra meg.').harKonkretSituasjon).toBe(true);
    expect(finnSignaler('Det er vanskelig å reise.').harKonkretSituasjon).toBe(false);
  });

  it('teller tegn og setninger', () => {
    const s = finnSignaler('  Jeg blir svimmel. Jeg må sitte.  ');
    expect(s.antallTegn).toBe(31);
    expect(s.antallSetninger).toBe(2);
  });

  it('tåler tom tekst', () => {
    const s = finnSignaler('');
    expect(s.antallTegn).toBe(0);
    expect(s.manglerOmraader).toHaveLength(3);
  });

  it('dekker eksempelet kravene selv bruker som godt nok', () => {
    const s = finnSignaler(
      'Jeg må hvile to ganger på de tre hundre meterne til holdeplassen, og forrige uke ' +
        'gikk bussen mens jeg fortsatt sto og skulle opp trinnet.',
    );
    expect(s.manglerOmraader).toEqual([]);
    expect(s.harKonkretSituasjon).toBe(true);
  });
});

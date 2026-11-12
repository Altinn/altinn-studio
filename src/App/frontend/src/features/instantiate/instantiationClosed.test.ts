import { getInstantiationClosedReason } from 'src/features/instantiate/instantiationClosed';

describe('getInstantiationClosedReason', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  const tt02Host = 'ttd.apps.tt02.altinn.no';
  const prodHost = 'ttd.apps.altinn.no';

  it.each([
    [undefined, undefined],
    [null, undefined],
    ['2026-10-21T11:59:59Z', 'closed'],
    ['2026-10-21T12:00:01Z', undefined],
    ['2026-10-21T11:59:59.1504337Z', 'closed'],
    ['2026-10-21T13:59:59+02:00', 'closed'],
    ['2026-10-21T14:00:01+02:00', undefined],
    ['2026-10-21T11:59:59', 'closed'],
    ['2026-10-21T12:00:01', undefined],
    ['2026-10-21', 'closed'],
    ['2026-10-22', undefined],
    ['not a date', undefined],
  ])('validTo %s gives %s', (validTo, expected) => {
    expect(getInstantiationClosedReason({ validTo }, now, tt02Host)?.reason).toBe(expected);
  });

  it.each([
    [undefined, undefined],
    [null, undefined],
    ['2026-10-21T12:00:01Z', 'notYetOpen'],
    ['2026-10-21T11:59:59Z', undefined],
    ['2026-10-21T14:00:01+02:00', 'notYetOpen'],
    ['2026-10-21T12:00:01', 'notYetOpen'],
    ['2026-10-22', 'notYetOpen'],
    ['2026-10-21', undefined],
    ['not a date', undefined],
  ])('validFrom %s gives %s', (validFrom, expected) => {
    expect(getInstantiationClosedReason({ validFrom }, now, tt02Host)?.reason).toBe(expected);
  });

  it('reports when a not yet open service opens', () => {
    const result = getInstantiationClosedReason({ validFrom: '2026-10-22T08:00:00Z' }, now, tt02Host);
    expect(result).toEqual({ reason: 'notYetOpen', opensAt: new Date('2026-10-22T08:00:00Z') });
  });

  it.each([
    [prodHost, true, 'closed'],
    [prodHost, false, undefined],
    [tt02Host, true, undefined],
    ['local.altinn.cloud:8000', true, undefined],
  ])('on %s with disallowUserInstantiation %s gives %s', (host, disallowUserInstantiation, expected) => {
    expect(getInstantiationClosedReason({ disallowUserInstantiation }, now, host)?.reason).toBe(expected);
  });
});

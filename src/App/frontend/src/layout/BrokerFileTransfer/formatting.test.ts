import { describe, expect, it } from 'vitest';

import { formatRemainingTime } from 'src/layout/BrokerFileTransfer/formatting';

describe('formatRemainingTime', () => {
  it.each([
    [180, 'nb', '3 minutter'],
    [3570, 'nb', '1 time'],
    [5400, 'nb', '2 timer'],
    [180, 'en', '3 minutes'],
  ])('rounds %i seconds to the largest unit that fits (%s)', (seconds, language, expected) => {
    expect(formatRemainingTime(seconds, language)).toBe(expected);
  });

  it('gives no number for less than a minute', () => {
    expect(formatRemainingTime(59, 'nb')).toBeNull();
  });
});

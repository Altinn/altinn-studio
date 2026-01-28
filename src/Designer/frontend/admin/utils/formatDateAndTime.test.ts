import { getIsoRangeFromMinutes } from './formatDateAndTime';

describe('getIsoRangeFromMinutes', () => {
  it('returns ISO range based on minutes', () => {
    const now = new Date('2025-01-01T12:00:00.000Z');

    const result = getIsoRangeFromMinutes(60, now);

    expect(result.to).toBe('2025-01-01T12:00:00.000Z');
    expect(result.from).toBe('2025-01-01T11:00:00.000Z');
  });
});

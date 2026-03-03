import { formatDateAndTime } from './formatDateAndTime';
import { DateUtils } from '@studio/pure-functions';

describe('formatDateAndTime', () => {
  it('formats timestamp as date, time with dots and AM/PM', () => {
    const timestamp = new Date('2026-03-03T16:27:15Z').getTime();
    const isoString = new Date(timestamp).toISOString();
    const expectedDatePart = DateUtils.formatDateDDMMYYYY(isoString);
    const toLocaleTimeStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('4:27:15 PM');
    const result = formatDateAndTime(timestamp);
    expect(result).toBe(`${expectedDatePart}, 4.27.15 PM`);
    toLocaleTimeStringSpy.mockRestore();
  });
});

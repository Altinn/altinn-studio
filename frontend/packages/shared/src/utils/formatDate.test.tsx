import { formatNameAndDate } from './formatDate';

describe('formatNameAndDate', () => {
  it('should return positive result with date and name', () => {
    const name = 'Ali Nordmann';
    const date = new Date('Jan 31 2019 00:00').toString();
    const res = formatNameAndDate(name, date);
    expect(res).toMatch(`${name} 31.01.2019 00:00`);
  });

  it('should return positive result with empty date', () => {
    const name = 'Kari Hvermansen';
    const date = '';
    const res = formatNameAndDate(name, date);
    expect(res).toMatch(`${name} `);
  });

  it('should return positive result for empty name', () => {
    const name = '';
    const date = new Date('Jan 31 2019 00:00').toString();
    const res = formatNameAndDate(name, date);
    expect(res).toMatch(`${name} `);
  });
});

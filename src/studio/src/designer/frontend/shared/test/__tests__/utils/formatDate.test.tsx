import 'jest';
import { formatNameAndDate, returnDatestringFromDate } from './../../../utils/formatDate';

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

describe('returnDatestringFromDate', () => {

  it('should return positive result for "DD.MM.YYYY"', () => {
    const dateFromDatepicker = '31.01.2019';
    const format = 'DD.MM.YYYY';
    const res = returnDatestringFromDate(dateFromDatepicker, format);
    expect(res).toMatch('2019-01-31T00:00:00Z');
  });

  it('should return "Invalid date" for "DD.MM.YYYY"', () => {
    const dateFromDatepicker = '01.31.2019';
    const format = 'DD.MM.YYYY';
    const res = returnDatestringFromDate(dateFromDatepicker, format);
    expect(res).toMatch('Invalid date');
  });

  it('should return positive result for "MM.DD.YYYY"', () => {
    const dateFromDatepicker = '01.31.2019';
    const format = 'MM.DD.YYYY';
    const res = returnDatestringFromDate(dateFromDatepicker, format);
    expect(res).toMatch('2019-01-31T00:00:00Z');
  });

  it('should return "Invalid date" for "MM.DD.YYYY"', () => {
    const dateFromDatepicker = '31.01.2019';
    const format = 'MM.DD.YYYY';
    const res = returnDatestringFromDate(dateFromDatepicker, format);
    expect(res).toMatch('Invalid date');
  });

});

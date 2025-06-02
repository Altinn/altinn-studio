import { PrettyDateAndTime } from 'src/app-components/Datepicker/utils/dateHelpers';
import { formatDateLocale } from 'src/utils/dateUtils';
import type { Token } from 'src/utils/dateUtils';

const zip = <T, U>(a: T[], b: U[]): [T, U][] => a.map((k, i) => [k, b[i]]);
const nArray = (n: number, start = 0) => Array.from({ length: n }, (_, i) => i + start);

function input(token: Token) {
  if (['g', 'gg', 'ggg', 'gggg', 'ggggg'].includes(token)) {
    return [];
  }
  if (['y', 'yy', 'yyy', 'yyyy', 'u', 'uu', 'uuu', 'uuuu'].includes(token)) {
    return [
      new Date(-43, 0, 1),
      new Date('0001-05-15'),
      new Date('1900-05-15'),
      new Date('2017-05-15'),
      new Date('2012-12-31'),
    ];
  }
  if (['G', 'GG', 'GGG', 'GGGG', 'GGGGG'].includes(token)) {
    return [new Date(-43, 0, 1), new Date('1900-05-15')];
  }
  if (['M', 'MM', 'MMM', 'MMMM', 'MMMMM'].includes(token)) {
    return nArray(12).map((i) => new Date(2023, i, 15));
  }
  if (['d', 'dd'].includes(token)) {
    return nArray(31, 1).map((i) => new Date(2023, 0, i));
  }
  if (['E', 'EE', 'EEE', 'EEEE', 'EEEEE', 'e', 'ee', 'eee', 'eeee', 'eeeee'].includes(token)) {
    return nArray(7, 1).map((i) => new Date(2018, 0, i));
  }
  if (['h', 'hh', 'H', 'HH', 'a'].includes(token)) {
    return nArray(24).map((i) => new Date(2023, 5, 15, i));
  }
  if (['m', 'mm'].includes(token)) {
    return nArray(60).map((i) => new Date(2023, 5, 15, 12, i));
  }
  if (['s', 'ss'].includes(token)) {
    return nArray(60).map((i) => new Date(2023, 5, 15, 12, 13, i));
  }

  throw new Error(`No input examples for token: ${token}`);
}
function output(token: Token, locale = 'en') {
  if (token == 'h') {
    const hourCycle = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    return [...hourCycle, ...hourCycle];
  }
  if (token == 'hh') {
    const hourCycle = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
    return [...hourCycle, ...hourCycle];
  }
  if (token == 'H') {
    return nArray(24).map((n) => n.toString());
  }
  if (token === 'HH') {
    return nArray(24).map((n) => n.toString().padStart(2, '0'));
  }
  if (token === 'y') {
    return ['44', '1', '1900', '2017', '2012'];
  }
  if (token === 'yy') {
    return ['44', '01', '00', '17', '12'];
  }
  if (token === 'yyy') {
    return ['044', '001', '1900', '2017', '2012'];
  }
  if (token === 'yyyy') {
    return ['0044', '0001', '1900', '2017', '2012'];
  }
  if (token === 'u') {
    return ['-43', '1', '1900', '2017', '2012'];
  }
  if (token === 'uu') {
    return ['-43', '01', '1900', '2017', '2012'];
  }
  if (token === 'uuu') {
    return ['-043', '001', '1900', '2017', '2012'];
  }
  if (token === 'uuuu') {
    return ['-0043', '0001', '1900', '2017', '2012'];
  }
  if (['G', 'GG', 'GGG'].includes(token)) {
    if (locale === 'nb') {
      return ['f.Kr.', 'e.Kr.'];
    }
    return ['BC', 'AD'];
  }
  if (token === 'GGGG') {
    if (locale === 'nb') {
      return ['før Kristus', 'etter Kristus'];
    }
    return ['Before Christ', 'Anno Domini'];
  }
  if (token === 'GGGGG') {
    if (locale === 'nb') {
      return ['f.Kr.', 'e.Kr.'];
    }
    return ['B', 'A'];
  }
  if (token == 'M') {
    return nArray(12, 1).map((n) => n.toString());
  }
  if (token == 'MM') {
    return nArray(12, 1).map((n) => n.toString().padStart(2, '0'));
  }
  if (token == 'MMM') {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }
  if (token == 'MMMM') {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
  }
  if (token === 'd') {
    return nArray(31, 1).map((d) => d.toString());
  }
  if (token === 'dd') {
    return nArray(31, 1).map((d) => d.toString().padStart(2, '0'));
  }
  if (['E', 'EE', 'EEE'].includes(token)) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  if (token === 'EEEE') {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }
  if (token === 'EEEEE') {
    return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  }
  if (token === 'a' && locale === 'en') {
    return nArray(12)
      .map(() => 'AM')
      .concat(nArray(12).map(() => 'PM'));
  }
  if (token === 'a') {
    return nArray(12)
      .map(() => 'a.m.')
      .concat(nArray(12).map(() => 'p.m.'));
  }
  if (['m', 's'].includes(token)) {
    return nArray(60).map((n) => n.toString());
  }
  if (['mm', 'ss'].includes(token)) {
    return nArray(60).map((n) => n.toString().padStart(2, '0'));
  }

  throw new Error(`No output examples for token: ${token}`);
}

const date = new Date('2023-05-15T12:30:45.789Z');
const yearThirtyThree = new Date('0033-01-01T00:00:00.000Z');
const hourMidnight = new Date('2023-05-15T00:30:45.789Z');

describe('formatDateLocale', () => {
  describe('Era', () => {
    it.each(zip(input('G'), output('G')))('formats era correctly with token "G"', (input, output) => {
      expect(formatDateLocale('en', input, 'G')).toBe(output);
    });
    it.each(zip(input('G'), output('G', 'nb')))('formats era correctly with token "G"', (input, output) => {
      expect(formatDateLocale('nb', input, 'G')).toBe(output);
    });
    it.each(zip(input('GG'), output('GG')))('formats era correctly with token "GG"', (input, output) => {
      expect(formatDateLocale('en', input, 'GG')).toBe(output);
    });
    it.each(zip(input('GG'), output('GG', 'nb')))('formats era correctly with token "GG"', (input, output) => {
      expect(formatDateLocale('nb', input, 'GG')).toBe(output);
    });
    it.each(zip(input('GGG'), output('GGG')))('formats era correctly with token "GGG"', (input, output) => {
      expect(formatDateLocale('en', input, 'GGG')).toBe(output);
    });
    it.each(zip(input('GGG'), output('GGG', 'nb')))('formats era correctly with token "GGG"', (input, output) => {
      expect(formatDateLocale('nb', input, 'GGG')).toBe(output);
    });
    it.each(zip(input('GGGG'), output('GGGG')))('formats era correctly with token "GGGG"', (input, output) => {
      expect(formatDateLocale('en', input, 'GGGG')).toBe(output);
    });
    it.each(zip(input('GGGG'), output('GGGG', 'nb')))('formats era correctly with token "GGGG"', (input, output) => {
      expect(formatDateLocale('nb', input, 'GGGG')).toBe(output);
    });
    it.each(zip(input('GGGGG'), output('GGGGG')))('formats era correctly with token "GGGGG"', (input, output) => {
      expect(formatDateLocale('en', input, 'GGGGG')).toBe(output);
    });
    it.each(zip(input('GGGGG'), output('GGGGG', 'nb')))('formats era correctly with token "GGGGG"', (input, output) => {
      expect(formatDateLocale('nb', input, 'GGGGG')).toBe(output);
    });
  });
  describe('Year', () => {
    it('formats year correctly', () => {
      expect(formatDateLocale('en', date, 'y')).toBe('2023');
      expect(formatDateLocale('en', date, 'yy')).toBe('23');
      expect(formatDateLocale('en', date, 'yyy')).toBe('2023');

      expect(formatDateLocale('en', yearThirtyThree, 'yyy')).toBe('033');
      expect(formatDateLocale('en', yearThirtyThree, 'yyyy')).toBe('0033');
      expect(formatDateLocale('en', date, 'yyyy')).toBe('2023');
      expect(formatDateLocale('en', date, 'y yy yyy yyyy')).toBe('2023 23 2023 2023');
    });

    it.each(zip(input('y'), output('y')))('formats year correctly with token "y"', (input, output) => {
      expect(formatDateLocale('en', input, 'y')).toBe(output);
      expect(formatDateLocale('nb', input, 'y')).toBe(output);
    });

    it.each(zip(input('yy'), output('yy')))('formats year correctly with token "yy"', (input, output) => {
      expect(formatDateLocale('en', input, 'yy')).toBe(output);
      expect(formatDateLocale('nb', input, 'yy')).toBe(output);
    });

    it.each(zip(input('yyy'), output('yyy')))('formats year correctly with token "yyy"', (input, output) => {
      expect(formatDateLocale('en', input, 'yyy')).toBe(output);
      expect(formatDateLocale('nb', input, 'yyy')).toBe(output);
    });

    it.each(zip(input('yyyy'), output('yyyy')))('formats year correctly with token "yyyy"', (input, output) => {
      expect(formatDateLocale('en', input, 'yyyy')).toBe(output);
      expect(formatDateLocale('nb', input, 'yyyy')).toBe(output);
    });

    it.each(zip(input('u'), output('u')))('formats year correctly with token "u"', (input, output) => {
      expect(formatDateLocale('en', input, 'u')).toBe(output);
      expect(formatDateLocale('nb', input, 'u')).toBe(output);
    });

    it.each(zip(input('uu'), output('uu')))('formats year correctly with token "uu"', (input, output) => {
      expect(formatDateLocale('en', input, 'uu')).toBe(output);
      expect(formatDateLocale('nb', input, 'uu')).toBe(output);
    });

    it.each(zip(input('uuu'), output('uuu')))('formats year correctly with token "uuu"', (input, output) => {
      expect(formatDateLocale('en', input, 'uuu')).toBe(output);
      expect(formatDateLocale('nb', input, 'uuu')).toBe(output);
    });

    it.each(zip(input('uuuu'), output('uuuu')))('formats year correctly with token "uuuu"', (input, output) => {
      expect(formatDateLocale('en', input, 'uuuu')).toBe(output);
      expect(formatDateLocale('nb', input, 'uuuu')).toBe(output);
    });
  });

  describe('Month', () => {
    it('formats month correctly', () => {
      expect(formatDateLocale('en', date, 'M')).toBe('5');
      expect(formatDateLocale('en', date, 'MM')).toBe('05');
      expect(formatDateLocale('en', date, 'MMM')).toBe('May');
      expect(formatDateLocale('en', date, 'MMMM')).toBe('May');

      expect(formatDateLocale('nb', date, 'M')).toBe('5');
      expect(formatDateLocale('nb', date, 'MM')).toBe('05');
      expect(formatDateLocale('nb', date, 'MMM')).toBe('mai');
      expect(formatDateLocale('nb', date, 'MMMM')).toBe('mai');
    });

    it.each(zip(input('M'), output('M')))('formats month correctly with token "M"', (input, output) => {
      expect(formatDateLocale('en', input, 'M')).toBe(output);
      expect(formatDateLocale('nb', input, 'M')).toBe(output);
    });

    it.each(zip(input('MM'), output('MM')))('formats month correctly with token "MM"', (input, output) => {
      expect(formatDateLocale('en', input, 'MM')).toBe(output);
      expect(formatDateLocale('nb', input, 'MM')).toBe(output);
    });

    it.each(zip(input('MMM'), output('MMM')))('formats month correctly with token "MMM"', (input, output) => {
      expect(formatDateLocale('en', input, 'MMM')).toBe(output);
    });

    it.each(zip(input('MMMM'), output('MMMM')))('formats month correctly with token "MMMM"', (input, output) => {
      expect(formatDateLocale('en', input, 'MMMM')).toBe(output);
    });
  });

  describe('Day', () => {
    it('formats day correctly', () => {
      expect(formatDateLocale('en', date, 'd')).toBe('15');
      expect(formatDateLocale('en', date, 'dd')).toBe('15');
    });

    it.each(zip(input('d'), output('d')))('formats day correctly with token "d"', (input, output) => {
      expect(formatDateLocale('en', input, 'd')).toBe(output);
      expect(formatDateLocale('nb', input, 'd')).toBe(output);
    });

    it.each(zip(input('dd'), output('dd')))('formats day correctly with token "d"', (input, output) => {
      expect(formatDateLocale('en', input, 'dd')).toBe(output);
      expect(formatDateLocale('nb', input, 'dd')).toBe(output);
    });
  });

  describe('Weekday', () => {
    it('formats weekday correctly', () => {
      expect(formatDateLocale('en', date, 'E')).toBe('Mon');
      expect(formatDateLocale('en', date, 'EE')).toBe('Mon');
      expect(formatDateLocale('en', date, 'EEE')).toBe('Mon');
      expect(formatDateLocale('en', date, 'EEEE')).toBe('Monday');
      expect(formatDateLocale('en', date, 'EEEEE')).toBe('M');
    });

    it.each(zip(input('E'), output('E')))('formats weekday correctly with token "E"', (input, output) => {
      expect(formatDateLocale('en', input, 'E')).toBe(output);
    });

    it.each(zip(input('EE'), output('EE')))('formats weekday correctly with token "EE"', (input, output) => {
      expect(formatDateLocale('en', input, 'EE')).toBe(output);
    });

    it.each(zip(input('EEE'), output('EEE')))('formats weekday correctly with token "EEE"', (input, output) => {
      expect(formatDateLocale('en', input, 'EEE')).toBe(output);
    });

    it.each(zip(input('EEEE'), output('EEEE')))('formats weekday correctly with token "EEEE"', (input, output) => {
      expect(formatDateLocale('en', input, 'EEEE')).toBe(output);
    });
    it.each(zip(input('EEEEE'), output('EEEEE')))('formats weekday correctly with token "EEEEE"', (input, output) => {
      expect(formatDateLocale('en', input, 'EEEEE')).toBe(output);
    });
  });

  describe('AM/PM', () => {
    it.each(zip(input('a'), output('a')))('formats AM/PM correctly with token "a"', (input, output) => {
      expect(formatDateLocale('en', input, 'a')).toBe(output);
    });
    it.each(zip(input('a'), output('a', 'nb')))('formats AM/PM correctly with token "a"', (input, output) => {
      expect(formatDateLocale('nb', input, 'a')).toBe(output);
    });
    it.each(zip(input('a'), output('a', 'nn')))('formats AM/PM correctly with token "a"', (input, output) => {
      expect(formatDateLocale('nn', input, 'a')).toBe(output);
    });
  });

  describe('Hour', () => {
    it.each(zip(input('h'), output('h')))('formats hour correctly with token "h"', (input, output) => {
      expect(formatDateLocale('en', input, 'h')).toBe(output);
      expect(formatDateLocale('nb', input, 'h')).toBe(output);
    });

    it.each(zip(input('hh'), output('hh')))('formats hour correctly with token "hh"', (input, output) => {
      expect(formatDateLocale('en', input, 'hh')).toBe(output);
      expect(formatDateLocale('nb', input, 'hh')).toBe(output);
    });

    it.each(zip(input('H'), output('H')))('formats hour correctly with s token "H"', (input, output) => {
      expect(formatDateLocale('en', input, 'H')).toBe(output);
      expect(formatDateLocale('nb', input, 'H')).toBe(output);
    });

    it.each(zip(input('HH'), output('HH')))('formats hour correctly with s token "HH"', (input, output) => {
      expect(formatDateLocale('en', input, 'HH')).toBe(output);
      expect(formatDateLocale('nb', input, 'HH')).toBe(output);
    });
  });

  describe('Minute', () => {
    it.each(zip(input('m'), output('m')))('formats minute correctly with token "m"', (input, output) => {
      expect(formatDateLocale('en', input, 'm')).toBe(output);
      expect(formatDateLocale('nb', input, 'm')).toBe(output);
    });
    it.each(zip(input('mm'), output('mm')))('formats minute correctly with token "mm"', (input, output) => {
      expect(formatDateLocale('en', input, 'mm')).toBe(output);
      expect(formatDateLocale('nb', input, 'mm')).toBe(output);
    });
  });

  describe('Second', () => {
    it.each(zip(input('s'), output('s')))('formats second correctly with token "s"', (input, output) => {
      expect(formatDateLocale('en', input, 's')).toBe(output);
      expect(formatDateLocale('nb', input, 's')).toBe(output);
    });

    it.each(zip(input('ss'), output('ss')))('formats second correctly with token "ss"', (input, output) => {
      expect(formatDateLocale('en', input, 'ss')).toBe(output);
      expect(formatDateLocale('nb', input, 'ss')).toBe(output);
    });
  });
  describe('Fractional Seconds', () => {
    it('formats second correctly with token "S"', () => {
      const i1 = new Date('2023-05-15T12:30:45.1Z');
      expect(formatDateLocale('en', i1, 'S')).toBe('1');
      expect(formatDateLocale('nb', i1, 'S')).toBe('1');

      const i2 = new Date('2023-05-15T12:30:45.323Z');
      expect(formatDateLocale('en', i2, 'S')).toBe('3');
      expect(formatDateLocale('nb', i2, 'S')).toBe('3');

      const i3 = new Date('2023-05-15T12:30:45.023Z');
      expect(formatDateLocale('en', i3, 'S')).toBe('0');
      expect(formatDateLocale('nb', i3, 'S')).toBe('0');
    });

    it('formats second correctly with token "SS"', () => {
      const i1 = new Date('2023-05-15T12:30:45.012Z');
      expect(formatDateLocale('en', i1, 'SS')).toBe('01');
      expect(formatDateLocale('nb', i1, 'SS')).toBe('01');

      const i2 = new Date('2023-05-15T12:30:45.323Z');
      expect(formatDateLocale('en', i2, 'SS')).toBe('32');
      expect(formatDateLocale('nb', i2, 'SS')).toBe('32');

      const i3 = new Date('2023-05-15T12:30:45.023Z');
      expect(formatDateLocale('en', i3, 'SS')).toBe('02');
      expect(formatDateLocale('nb', i3, 'SS')).toBe('02');
    });

    it('formats second correctly with token "SSS"', () => {
      const i1 = new Date('2023-05-15T12:30:45.012Z');
      expect(formatDateLocale('en', i1, 'SSS')).toBe('012');
      expect(formatDateLocale('nb', i1, 'SSS')).toBe('012');

      const i2 = new Date('2023-05-15T12:30:45.323Z');
      expect(formatDateLocale('en', i2, 'SSS')).toBe('323');
      expect(formatDateLocale('nb', i2, 'SSS')).toBe('323');

      const i3 = new Date('2023-05-15T12:30:45.023Z');
      expect(formatDateLocale('en', i3, 'SSS')).toBe('023');
      expect(formatDateLocale('nb', i3, 'SSS')).toBe('023');
    });
  });

  it('formats the input date string with arbitrary separators', () => {
    expect(formatDateLocale('nb', date, 'HH:mm')).toBe('12:30');
    expect(formatDateLocale('nb', date, 'HH/mm')).toBe('12/30');
    expect(formatDateLocale('nb', date, 'HH.mm')).toBe('12.30');
    expect(formatDateLocale('nb', date, 'HH mm')).toBe('12 30');
    expect(formatDateLocale('nb', date, 'HH - mm')).toBe('12 - 30');
    expect(formatDateLocale('nb', date, 'HH - mm - ss')).toBe('12 - 30 - 45');
    expect(formatDateLocale('nb', date, 'dd-MM.yyyy HH - mm:ss')).toBe('15-05.2023 12 - 30:45');
  });

  it('formats full date and time correctly', () => {
    expect(formatDateLocale('nb', date, 'yyyy-MM-dd HH:mm:ss')).toBe('2023-05-15 12:30:45');
    expect(formatDateLocale('en', date, 'yyyy-MM-dd HH:mm:ss')).toBe('2023-05-15 12:30:45');
    expect(formatDateLocale('nb', hourMidnight, 'E, MMM d, yyyy h:mm a')).toBe('man, mai 15, 2023 12:30 a.m.');
    expect(formatDateLocale('en', hourMidnight, 'E, MMM d, yyyy h:mm a')).toBe('Mon, May 15, 2023 12:30 AM');
  });

  it('formats on a default locale format if no unicodeToken is provided', () => {
    expect(formatDateLocale('nb', date)).toBe('15.05.2023');
    expect(formatDateLocale('en', date)).toBe('5/15/23');
  });
  describe('Date Formatting Comparison Tests', () => {
    const testDate = new Date('2025-03-12T07:11:00Z');
    it('should show how formatDateLocale handles different locales with PrettyDateAndTime', () => {
      const nbResult = formatDateLocale('nb', testDate, PrettyDateAndTime);
      const enResult = formatDateLocale('en', testDate, PrettyDateAndTime);

      expect(nbResult).toBe('12.03.2025 / 07:11'); // European
      expect(enResult).toBe('12.03.2025 / 07:11'); // American
    });
  });
});

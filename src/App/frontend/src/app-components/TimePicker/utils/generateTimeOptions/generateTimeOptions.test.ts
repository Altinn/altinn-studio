import {
  generateHourOptions,
  generateMinuteOptions,
  generateSecondOptions,
} from 'src/app-components/TimePicker/utils/generateTimeOptions/generateTimeOptions';

describe('generateTimeOptions', () => {
  describe('generateHourOptions', () => {
    describe('24-hour format', () => {
      it('should generate 24 options from 00 to 23', () => {
        const options = generateHourOptions(false);

        expect(options).toHaveLength(24);
        expect(options[0]).toEqual({ value: 0, label: '00' });
        expect(options[12]).toEqual({ value: 12, label: '12' });
        expect(options[23]).toEqual({ value: 23, label: '23' });
      });

      it('should pad single digits with zero', () => {
        const options = generateHourOptions(false);

        expect(options[1].label).toBe('01');
        expect(options[9].label).toBe('09');
        expect(options[10].label).toBe('10');
      });
    });

    describe('12-hour format', () => {
      it('should generate 12 options from 01 to 12', () => {
        const options = generateHourOptions(true);

        expect(options).toHaveLength(12);
        expect(options[0]).toEqual({ value: 1, label: '01' });
        expect(options[11]).toEqual({ value: 12, label: '12' });
      });

      it('should not include 00 or values above 12', () => {
        const options = generateHourOptions(true);

        const values = options.map((o) => o.value);
        expect(values).not.toContain(0);
        expect(values).not.toContain(13);
        expect(Math.max(...(values as number[]))).toBe(12);
        expect(Math.min(...(values as number[]))).toBe(1);
      });
    });
  });

  describe('generateMinuteOptions', () => {
    it('should generate 60 options by default (step=1)', () => {
      const options = generateMinuteOptions();

      expect(options).toHaveLength(60);
      expect(options[0]).toEqual({ value: 0, label: '00' });
      expect(options[30]).toEqual({ value: 30, label: '30' });
      expect(options[59]).toEqual({ value: 59, label: '59' });
    });

    it('should generate correct number of options for step=5', () => {
      const options = generateMinuteOptions(5);

      expect(options).toHaveLength(12); // 60 / 5 = 12
      expect(options[0]).toEqual({ value: 0, label: '00' });
      expect(options[1]).toEqual({ value: 5, label: '05' });
      expect(options[11]).toEqual({ value: 55, label: '55' });
    });

    it('should generate correct number of options for step=15', () => {
      const options = generateMinuteOptions(15);

      expect(options).toHaveLength(4); // 60 / 15 = 4
      expect(options[0]).toEqual({ value: 0, label: '00' });
      expect(options[1]).toEqual({ value: 15, label: '15' });
      expect(options[2]).toEqual({ value: 30, label: '30' });
      expect(options[3]).toEqual({ value: 45, label: '45' });
    });

    it('should pad single digits with zero', () => {
      const options = generateMinuteOptions(1);

      expect(options[5].label).toBe('05');
      expect(options[9].label).toBe('09');
      expect(options[10].label).toBe('10');
    });
  });

  describe('generateSecondOptions', () => {
    it('should generate 60 options by default (step=1)', () => {
      const options = generateSecondOptions();

      expect(options).toHaveLength(60);
      expect(options[0]).toEqual({ value: 0, label: '00' });
      expect(options[30]).toEqual({ value: 30, label: '30' });
      expect(options[59]).toEqual({ value: 59, label: '59' });
    });

    it('should generate correct number of options for step=5', () => {
      const options = generateSecondOptions(5);

      expect(options).toHaveLength(12); // 60 / 5 = 12
      expect(options[0]).toEqual({ value: 0, label: '00' });
      expect(options[1]).toEqual({ value: 5, label: '05' });
      expect(options[11]).toEqual({ value: 55, label: '55' });
    });

    it('should behave identically to generateMinuteOptions', () => {
      const minuteOptions = generateMinuteOptions(10);
      const secondOptions = generateSecondOptions(10);

      expect(secondOptions).toEqual(minuteOptions);
    });
  });
});

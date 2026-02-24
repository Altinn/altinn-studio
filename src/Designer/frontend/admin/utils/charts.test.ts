import type { TimeScaleOptions } from 'chart.js';
import { getChartOptions } from './charts';

describe('getChartOptions', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets min and max based on interval and range', () => {
    const intervalInMinutes = 5;
    const rangeInMinutes = 60;
    const options = getChartOptions(intervalInMinutes, rangeInMinutes);

    const xScale = options.scales?.x as TimeScaleOptions;

    expect(xScale?.min).toBe(1_699_996_200_000);
    expect(xScale?.max).toBe(1_700_000_100_000);
  });
});

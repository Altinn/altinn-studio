import type { Interval } from '../types';

export class NumberUtils {
  /** Verifies if a number is within an open interval (an interval of which the minimum and maximum values are excluded) */
  static isWithinOpenInterval = (value: number, { min, max }: Interval): boolean =>
    value > min && value < max;
}

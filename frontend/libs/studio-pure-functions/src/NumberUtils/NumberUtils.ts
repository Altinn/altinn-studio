export class NumberUtils {
  /** Verifies if a number is within an open range (a range of which the minimum and maximum values are excluded) */
  public static isWithinOpenRange = (value: number, min: number, max: number): boolean => {
    return value > min && value < max;
  };
}

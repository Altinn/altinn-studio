export class ValidationUtils {
  public static valueExists<T>(value: T): boolean {
    return value !== undefined && value !== null && value !== '';
  }
}

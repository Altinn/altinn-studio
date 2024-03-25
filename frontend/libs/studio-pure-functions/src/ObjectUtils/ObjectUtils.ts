export class ObjectUtils {
  static deepCopy = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;
}

export type Options<K extends string, V = string> = Partial<Record<K, V>>;

export interface GetInTouchProvider<T, Options = null> {
  buildContactUrl: <K extends string, V extends string>(channel: T, options?: Options) => string;
}

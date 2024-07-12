export interface ContactProvider<T> {
  buildContactUrl: (channel: T) => string;
}

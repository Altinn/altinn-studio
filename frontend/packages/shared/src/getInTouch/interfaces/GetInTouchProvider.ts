export interface GetInTouchProvider<T> {
  buildContactUrl: (channel: T) => string;
}

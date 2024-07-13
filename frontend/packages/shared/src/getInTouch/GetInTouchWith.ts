import { type GetInTouchProvider } from './interfaces/GetInTouchProvider';

export class GetInTouchWith<T> {
  constructor(private contactProvider: GetInTouchProvider<T>) {}

  public url(selectedChannel: T): string {
    return this.contactProvider.buildContactUrl(selectedChannel);
  }
}

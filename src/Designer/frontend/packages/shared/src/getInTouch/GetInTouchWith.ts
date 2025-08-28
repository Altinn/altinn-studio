import { type GetInTouchProvider } from './interfaces/GetInTouchProvider';

export class GetInTouchWith<T, Options> {
  constructor(private contactProvider: GetInTouchProvider<T, Options>) {}

  public url(selectedChannel: T, options?: Options): string {
    return this.contactProvider.buildContactUrl(selectedChannel, options);
  }
}

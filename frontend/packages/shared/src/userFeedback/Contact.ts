import { ContactProvider } from './interfaces/ContactProvider';

export class Contact<T> {
  constructor(private contactProvider: ContactProvider<T>) {}

  public url(selectedChannel: T): string {
    return this.contactProvider.buildContactUrl(selectedChannel);
  }
}

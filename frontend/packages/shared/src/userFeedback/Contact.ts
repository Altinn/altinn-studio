import { ContactProvider } from './interfaces/ContactProvider';

export class Contact<T> {
  constructor(private contactProvider: ContactProvider<T>) {}

  public contactUrl(selectedChannel: T): string {
    return this.contactProvider.getFeedbackUrl(selectedChannel);
  }
}

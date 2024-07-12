import { ContactProvider } from './interfaces/ContactProvider';

export class Contact {
  constructor(private contactProvider: ContactProvider) {}

  public getFeedbackUrl<T>(selectedChannel: T): string {
    return this.contactProvider.getFeedbackUrl(selectedChannel);
  }
}

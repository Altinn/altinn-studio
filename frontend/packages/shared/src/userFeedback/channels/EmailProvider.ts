import { ContactProvider } from '../interfaces/ContactProvider';

export type EmailChannel = 'serviceDesk' | 'serviceOwner';

const emailChannelMap: Record<EmailChannel, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
  serviceOwner: 'mailto:tjenesteeier@altinn.no',
};

export class EmailProvider implements ContactProvider {
  public getFeedbackUrl(selectedChannel: EmailChannel = 'serviceOwner'): string {
    return emailChannelMap[selectedChannel];
  }
}

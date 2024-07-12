import { ContactProvider } from '../interfaces/ContactProvider';

export type EmailChannel = 'serviceDesk' | 'serviceOwner';

const emailChannelMap: Record<EmailChannel, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
  serviceOwner: 'mailto:tjenesteeier@altinn.no',
};

export class EmailContactProvider implements ContactProvider {
  public getFeedbackUrl(selectedChannel: EmailChannel): string {
    const defaultChannel = emailChannelMap['serviceOwner'];
    return emailChannelMap[selectedChannel] || defaultChannel;
  }
}

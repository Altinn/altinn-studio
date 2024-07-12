import { type ContactProvider } from '../interfaces/ContactProvider';

type EmailChannel = 'serviceDesk' | 'serviceOwner';

const emailChannelMap: Record<EmailChannel, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
  serviceOwner: 'mailto:tjenesteeier@altinn.no',
};

export class EmailContactProvider implements ContactProvider<EmailChannel> {
  public buildContactUrl(selectedChannel: EmailChannel): string {
    const defaultChannel = emailChannelMap['serviceOwner'];
    return emailChannelMap[selectedChannel] || defaultChannel;
  }
}

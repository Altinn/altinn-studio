import { type GetInTouchProvider } from '../interfaces/GetInTouchProvider';

type EmailChannel = 'serviceDesk' | 'serviceOwner';

const emailChannelMap: Record<EmailChannel, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
  serviceOwner: 'mailto:tjenesteeier@altinn.no',
};

export class EmailContactProvider implements GetInTouchProvider<EmailChannel> {
  public buildContactUrl(selectedChannel: EmailChannel): string {
    return emailChannelMap[selectedChannel];
  }
}

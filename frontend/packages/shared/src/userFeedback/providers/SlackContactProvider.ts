import { ContactProvider } from '../interfaces/ContactProvider';

export type SlackChannel = 'product-altinn-studio' | 'altinn';

const slackChannelMap: Record<SlackContactProvider, string> = {
  'product-altinn-studio': 'https://altinn.slack.com/archives/C02EJ9HKQA3',
  altinn: 'https://altinn.slack.com',
};

export class SlackContactProvider implements ContactProvider<SlackChannel> {
  public getFeedbackUrl(selectedChannel: SlackChannel): string {
    const defaultChannel = slackChannelMap['product-altinn-studio'];
    return slackChannelMap[selectedChannel] || defaultChannel;
  }
}

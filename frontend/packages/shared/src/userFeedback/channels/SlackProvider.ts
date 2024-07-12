import { ContactProvider } from '../interfaces/ContactProvider';

export type SlackChannel = 'product-altinn-studio' | 'altinn';

const slackChannelMap: Record<SlackProvider, string> = {
  'product-altinn-studio': 'https://altinn.slack.com/archives/C02EJ9HKQA3',
  altinn: 'https://altinn.slack.com',
};

export class SlackProvider implements ContactProvider {
  public getFeedbackUrl(selectedChannel: SlackChannel = 'product-altinn-studio'): string {
    return slackChannelMap[selectedChannel];
  }
}

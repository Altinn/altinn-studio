import { type GetInTouchProvider } from '../interfaces/GetInTouchProvider';

type SlackChannel = 'product-altinn-studio' | 'altinn';

const slackChannelMap: Record<SlackChannel, string> = {
  'product-altinn-studio': 'https://altinn.slack.com/archives/C02EJ9HKQA3',
  altinn: 'https://altinn.slack.com',
};

export class SlackContactProvider implements GetInTouchProvider<SlackChannel> {
  public buildContactUrl(selectedChannel: SlackChannel): string {
    return slackChannelMap[selectedChannel];
  }
}

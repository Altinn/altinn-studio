import { SlackContactProvider } from 'app-shared/getInTouch/providers/SlackContactProvider';

describe('SlackContactProvider', () => {
  it('should return correct Slack link based on selectedChannel', () => {
    const slackContactProvider = new SlackContactProvider();

    expect(slackContactProvider.buildContactUrl('altinn')).toBe(
      'https://digdir-samarbeid.slack.com',
    );
    expect(slackContactProvider.buildContactUrl('product-altinn-studio')).toBe(
      'https://digdir-samarbeid.slack.com/archives/C02EJ9HKQA3',
    );
  });
});

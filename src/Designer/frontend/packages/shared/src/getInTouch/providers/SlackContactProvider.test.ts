import { SlackContactProvider } from 'app-shared/getInTouch/providers/SlackContactProvider';

describe('SlackContactProvider', () => {
  it('should return correct Slack link based on selectedChannel', () => {
    const slackContactProvider = new SlackContactProvider();

    expect(slackContactProvider.buildContactUrl('altinn')).toBe('https://altinn.slack.com');
    expect(slackContactProvider.buildContactUrl('product-altinn-studio')).toBe(
      'https://altinn.slack.com/archives/C02EJ9HKQA3',
    );
  });
});

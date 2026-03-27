import { slackChannelToPayload, contactPointToSlackChannel } from './slackChannelUtils';
import type { SlackChannel } from './SlackChannelDialog/SlackChannelDialog';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

const channel: SlackChannel = {
  channelName: 'general',
  webhookUrl: 'https://hooks.slack.com/services/abc',
  isActive: true,
  environments: ['tt02', 'production'],
};

const channelNoWebhook: SlackChannel = {
  channelName: 'alerts',
  webhookUrl: '',
  isActive: false,
  environments: [],
};

describe('slackChannelToPayload', () => {
  it('maps channelName to name, isActive, and environments', () => {
    const result = slackChannelToPayload(channel);
    expect(result.name).toBe('general');
    expect(result.isActive).toBe(true);
    expect(result.environments).toEqual(['tt02', 'production']);
  });

  it('includes slack method with webhookUrl as value', () => {
    const result = slackChannelToPayload(channel);
    expect(result.methods).toEqual([
      { methodType: 'slack', value: 'https://hooks.slack.com/services/abc' },
    ]);
  });

  it('includes slack method with empty value when webhookUrl is empty', () => {
    const result = slackChannelToPayload(channelNoWebhook);
    expect(result.methods).toEqual([{ methodType: 'slack', value: '' }]);
  });
});

const contactPointWithSlack: ContactPoint = {
  id: 'cp-1',
  name: 'general',
  isActive: true,
  environments: ['tt02'],
  methods: [{ id: 'm1', methodType: 'slack', value: 'https://hooks.slack.com/services/abc' }],
};

const contactPointNoSlack: ContactPoint = {
  id: 'cp-2',
  name: 'alerts',
  isActive: false,
  environments: [],
  methods: [],
};

describe('contactPointToSlackChannel', () => {
  it('maps name to channelName, isActive, and environments', () => {
    const result = contactPointToSlackChannel(contactPointWithSlack);
    expect(result.channelName).toBe('general');
    expect(result.isActive).toBe(true);
    expect(result.environments).toEqual(['tt02']);
  });

  it('maps slack method value to webhookUrl', () => {
    const result = contactPointToSlackChannel(contactPointWithSlack);
    expect(result.webhookUrl).toBe('https://hooks.slack.com/services/abc');
  });

  it('falls back to empty string for webhookUrl when no slack method exists', () => {
    const result = contactPointToSlackChannel(contactPointNoSlack);
    expect(result.webhookUrl).toBe('');
  });
});

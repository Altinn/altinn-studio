import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import type { SlackChannel } from './SlackChannelDialog/SlackChannelDialog';

export const slackChannelToPayload = (channel: SlackChannel): ContactPointPayload => ({
  name: channel.channelName,
  isActive: channel.isActive,
  environments: channel.environments,
  methods: [{ methodType: 'slack', value: channel.webhookUrl }],
});

export const contactPointToSlackChannel = (cp: ContactPoint): SlackChannel => ({
  channelName: cp.name,
  isActive: cp.isActive,
  environments: cp.environments,
  webhookUrl: cp.methods.find((m) => m.methodType === 'slack')?.value ?? '',
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import { SlackChannelDialog } from './SlackChannelDialog';
import type { SlackChannel } from './SlackChannelDialog';

const org = 'ttd';

const defaultChannel: SlackChannel = {
  channelName: '',
  webhookUrl: '',
  isActive: true,
  environments: [],
};

const validChannel: SlackChannel = {
  channelName: '#general',
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
  isActive: true,
  environments: [],
};

type RenderProps = {
  initialValue?: SlackChannel;
  availableEnvironments?: string[];
  editingId?: string | null;
  onClose?: jest.Mock;
};

const renderSlackChannelDialog = ({
  initialValue = defaultChannel,
  availableEnvironments = ['tt02', 'production'],
  editingId = null,
  onClose = jest.fn(),
}: RenderProps = {}) =>
  renderWithProviders(
    <SlackChannelDialog
      initialValue={initialValue}
      availableEnvironments={availableEnvironments}
      org={org}
      editingId={editingId}
      onClose={onClose}
    />,
  );

const getAddButton = () => screen.getByRole('button', { name: textMock('general.add') });
const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });
const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });
const getChannelNameInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('settings.orgs.contact_points.field_channel_name')} ${textMock('general.required')}`,
  });
const getWebhookUrlInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('settings.orgs.contact_points.field_webhook_url')} ${textMock('general.required')}`,
  });

describe('SlackChannelDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', () => {
    renderSlackChannelDialog();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.add_slack_channel'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', () => {
    renderSlackChannelDialog({ editingId: 'slack-1' });
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.dialog_edit_slack_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders add button when not editing', () => {
    renderSlackChannelDialog();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders save button when editing', () => {
    renderSlackChannelDialog({ editingId: 'slack-1' });
    expect(getSaveButton()).toBeInTheDocument();
  });

  it('renders the channel name and webhook URL fields', () => {
    renderSlackChannelDialog();
    expect(getChannelNameInput()).toBeInTheDocument();
    expect(getWebhookUrlInput()).toBeInTheDocument();
  });

  it('calls addContactPoint when saving a new valid channel', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({ initialValue: validChannel });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).toHaveBeenCalledWith(
      org,
      expect.objectContaining({ name: '#general' }),
    );
  });

  it('calls updateContactPoint when saving an edited channel', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({ initialValue: validChannel, editingId: 'slack-1' });
    await user.click(getSaveButton());
    expect(queriesMock.updateContactPoint).toHaveBeenCalledWith(
      org,
      'slack-1',
      expect.objectContaining({ name: '#general' }),
    );
  });

  it('does not call addContactPoint when channel name is missing', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      initialValue: {
        ...defaultChannel,
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
      },
    });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('does not call addContactPoint when webhook URL is missing', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({ initialValue: { ...defaultChannel, channelName: '#general' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('shows channel name required error after submit with empty channel name', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      initialValue: {
        ...defaultChannel,
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
      },
    });
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows webhook URL required error after submit with empty webhook URL', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({ initialValue: { ...defaultChannel, channelName: '#general' } });
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('keeps submit validation active after field changes', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog();
    await user.click(getAddButton());
    expect(screen.getAllByText(textMock('validation_errors.required')).length).toBeGreaterThan(0);
    await user.type(getChannelNameInput(), '#general');
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({ onClose });
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows invalid URL error when webhook URL does not match Slack format', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      initialValue: {
        ...defaultChannel,
        channelName: '#general',
        webhookUrl: 'https://example.com/webhook',
      },
    });
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('validation_errors.invalid_slack_webhook_url')),
    ).toBeInTheDocument();
  });

  it('does not call addContactPoint when webhook URL does not match Slack format', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      initialValue: {
        ...defaultChannel,
        channelName: '#general',
        webhookUrl: 'https://example.com/webhook',
      },
    });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });
});

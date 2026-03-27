import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { SlackChannelDialog } from './SlackChannelDialog';
import type { SlackChannel } from './SlackChannelDialog';

type TestWrapperProps = {
  channel?: SlackChannel;
  availableEnvironments?: string[];
  onFieldChange?: jest.Mock;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
  isEditing?: boolean;
  isSaving?: boolean;
};

const defaultChannel: SlackChannel = {
  channelName: '',
  webhookUrl: '',
  isActive: true,
  environments: [],
};

function SlackChannelDialogWrapper({
  channel = defaultChannel,
  availableEnvironments = ['tt02', 'production'],
  onFieldChange = jest.fn(),
  onSave = jest.fn(),
  onClose = jest.fn(),
  isEditing = false,
  isSaving = false,
}: TestWrapperProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()}>Open</button>
      <SlackChannelDialog
        dialogRef={dialogRef}
        channel={channel}
        availableEnvironments={availableEnvironments}
        onFieldChange={onFieldChange}
        onSave={onSave}
        onClose={onClose}
        isEditing={isEditing}
        isSaving={isSaving}
      />
    </>
  );
}

function SlackChannelDialogStatefulWrapper({
  channel = defaultChannel,
  availableEnvironments = ['tt02', 'production'],
  onSave = jest.fn(),
  onClose = jest.fn(),
  isEditing = false,
  isSaving = false,
}: Omit<TestWrapperProps, 'onFieldChange'>): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentChannel, setCurrentChannel] = useState(channel);

  const handleFieldChange = (field: keyof SlackChannel, value: string | boolean | string[]) => {
    setCurrentChannel((prev) => ({ ...prev, [field]: value as never }));
  };

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()}>Open</button>
      <SlackChannelDialog
        dialogRef={dialogRef}
        channel={currentChannel}
        availableEnvironments={availableEnvironments}
        onFieldChange={handleFieldChange}
        onSave={onSave}
        onClose={onClose}
        isEditing={isEditing}
        isSaving={isSaving}
      />
    </>
  );
}

const getSaveButton = () =>
  screen.getByRole('button', { name: textMock('settings.orgs.contact_points.save') });

const getCancelButton = () =>
  screen.getByRole('button', { name: textMock('settings.orgs.contact_points.cancel') });

const getChannelNameInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('settings.orgs.contact_points.field_channel_name')} ${textMock('general.required')}`,
  });

const getWebhookUrlInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('settings.orgs.contact_points.field_webhook_url')} ${textMock('general.required')}`,
  });

const renderSlackChannelDialog = (props: TestWrapperProps = {}) => {
  render(<SlackChannelDialogWrapper {...props} />);
};

describe('SlackChannelDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.add_slack_channel'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({ isEditing: true });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.dialog_edit_slack_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the channel name and webhook URL fields', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(getChannelNameInput()).toBeInTheDocument();
    expect(getWebhookUrlInput()).toBeInTheDocument();
  });

  it('calls onFieldChange when channel name input changes', async () => {
    const onFieldChange = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({ onFieldChange });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(getChannelNameInput(), '#general');
    expect(onFieldChange).toHaveBeenCalledWith('channelName', expect.any(String));
  });

  it('calls onFieldChange when webhook URL input changes', async () => {
    const onFieldChange = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({ onFieldChange });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(getWebhookUrlInput(), 'https://hooks.slack.com/test');
    expect(onFieldChange).toHaveBeenCalledWith('webhookUrl', expect.any(String));
  });

  it('calls onSave when saving with valid data', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({
      onSave,
      channel: {
        channelName: '#general',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when channel name is missing', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({
      onSave,
      channel: {
        channelName: '',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when webhook URL is missing', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({
      onSave,
      channel: { channelName: '#general', webhookUrl: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows channel name required error after submit with empty channel name', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      channel: {
        channelName: '',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows webhook URL required error after submit with empty webhook URL', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      channel: { channelName: '#general', webhookUrl: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('keeps submit validation active after field changes', async () => {
    const user = userEvent.setup();

    render(<SlackChannelDialogStatefulWrapper />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());

    expect(screen.getAllByText(textMock('validation_errors.required')).length).toBeGreaterThan(0);

    await user.type(getChannelNameInput(), '#general');

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({ onClose });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows invalid URL error when webhook URL does not match Slack format', async () => {
    const user = userEvent.setup();
    renderSlackChannelDialog({
      channel: {
        channelName: '#general',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(
      screen.getByText(textMock('validation_errors.invalid_slack_webhook_url')),
    ).toBeInTheDocument();
  });

  it('does not call onSave when webhook URL does not match Slack format', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderSlackChannelDialog({
      onSave,
      channel: {
        channelName: '#general',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('updates checked environments when channel prop changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <SlackChannelDialogWrapper
        channel={{
          channelName: '#general',
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
          isActive: true,
          environments: ['tt02'],
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('checkbox', { name: 'tt02' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'production' })).not.toBeChecked();

    rerender(
      <SlackChannelDialogWrapper
        channel={{
          channelName: '#general',
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/abc123',
          isActive: true,
          environments: ['production'],
        }}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'tt02' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'production' })).toBeChecked();
  });
});

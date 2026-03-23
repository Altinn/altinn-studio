import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { SlackChannelDialog } from './SlackChannelDialog';

type SlackChannelDraft = {
  channelName: string;
  webhookUrl: string;
  isActive: boolean;
};

type TestWrapperProps = {
  channel?: SlackChannelDraft;
  onFieldChange?: jest.Mock;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
  isEditing?: boolean;
  isSaving?: boolean;
};

const defaultChannel: SlackChannelDraft = { channelName: '', webhookUrl: '', isActive: true };

function SlackChannelDialogWrapper({
  channel = defaultChannel,
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
        onFieldChange={onFieldChange}
        onSave={onSave}
        onClose={onClose}
        isEditing={isEditing}
        isSaving={isSaving}
      />
    </>
  );
}

const renderSlackChannelDialog = async (props: TestWrapperProps = {}) => {
  const user = userEvent.setup();
  render(<SlackChannelDialogWrapper {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return user;
};

const getSaveButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.save') });

const getCancelButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.cancel') });

describe('SlackChannelDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', async () => {
    await renderSlackChannelDialog();
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.dialog_add_slack_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', async () => {
    await renderSlackChannelDialog({ isEditing: true });
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.dialog_edit_slack_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the channel name and webhook URL fields', async () => {
    await renderSlackChannelDialog();
    expect(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_channel_name'),
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_webhook_url'),
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('calls onFieldChange when channel name input changes', async () => {
    const onFieldChange = jest.fn();
    const user = await renderSlackChannelDialog({ onFieldChange });
    await user.type(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_channel_name'),
        exact: false,
      }),
      '#general',
    );
    expect(onFieldChange).toHaveBeenCalledWith('channelName', expect.any(String));
  });

  it('calls onFieldChange when webhook URL input changes', async () => {
    const onFieldChange = jest.fn();
    const user = await renderSlackChannelDialog({ onFieldChange });
    await user.type(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_webhook_url'),
        exact: false,
      }),
      'https://hooks.slack.com/test',
    );
    expect(onFieldChange).toHaveBeenCalledWith('webhookUrl', expect.any(String));
  });

  it('calls onSave when saving with valid data', async () => {
    const onSave = jest.fn();
    const user = await renderSlackChannelDialog({
      onSave,
      channel: {
        channelName: '#general',
        webhookUrl: 'https://hooks.slack.com/test',
        isActive: true,
      },
    });
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when channel name is missing', async () => {
    const onSave = jest.fn();
    const user = await renderSlackChannelDialog({
      onSave,
      channel: { channelName: '', webhookUrl: 'https://hooks.slack.com/test', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when webhook URL is missing', async () => {
    const onSave = jest.fn();
    const user = await renderSlackChannelDialog({
      onSave,
      channel: { channelName: '#general', webhookUrl: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows channel name required error after submit with empty channel name', async () => {
    const user = await renderSlackChannelDialog({
      channel: { channelName: '', webhookUrl: 'https://hooks.slack.com/test', isActive: true },
    });
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows webhook URL required error after submit with empty webhook URL', async () => {
    const user = await renderSlackChannelDialog({
      channel: { channelName: '#general', webhookUrl: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = await renderSlackChannelDialog({ onClose });
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

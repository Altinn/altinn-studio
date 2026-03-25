import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'admin/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { SlackChannelsList } from './SlackChannelsList';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

jest.mock('./SlackChannelDialog/SlackChannelDialog', () => ({
  SlackChannelDialog: ({
    isEditing,
    onSave,
    onClose,
  }: {
    isEditing: boolean;
    onSave: () => void;
    onClose: () => void;
  }) => (
    <div>
      <div>{isEditing ? 'EditDialog' : 'AddDialog'}</div>
      <button onClick={onSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

const testOrg = 'ttd';

const channel1: ContactPoint = {
  id: 'slack-1',
  name: '#general',
  isActive: true,
  environments: ['tt02'],
  methods: [{ id: 'm1', methodType: 'slack', value: 'https://hooks.slack.com/general' }],
};

const channel2: ContactPoint = {
  id: 'slack-2',
  name: '#dev',
  isActive: false,
  environments: [],
  methods: [{ id: 'm2', methodType: 'slack', value: 'https://hooks.slack.com/dev' }],
};

const defaultProps: { org: string; channels: ContactPoint[] } = {
  org: testOrg,
  channels: [],
};

const renderSlackChannelsList = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<SlackChannelsList {...defaultProps} {...props} />);

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.add_slack_channel') });

const getEditButton = () =>
  screen.getByRole('button', {
    name: textMock('org.settings.contact_points.dialog_edit_slack_title'),
  });

describe('SlackChannelsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the slack heading', () => {
    renderSlackChannelsList();
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.slack_heading'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the add contact button', () => {
    renderSlackChannelsList();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders channels in the table', () => {
    renderSlackChannelsList({ channels: [channel1, channel2] });
    expect(screen.getByText('#general')).toBeInTheDocument();
    expect(screen.getByText('#dev')).toBeInTheDocument();
  });

  it('renders webhook URL values for channels', () => {
    renderSlackChannelsList({ channels: [channel1] });
    expect(screen.getByText('https://hooks.slack.com/general')).toBeInTheDocument();
  });

  it('renders a switch for each channel with the channel name as aria-label', () => {
    renderSlackChannelsList({ channels: [channel1, channel2] });
    expect(screen.getByRole('switch', { name: '#general' })).toBeChecked();
    expect(screen.getByRole('switch', { name: '#dev' })).not.toBeChecked();
  });

  it('opens add dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList();
    await user.click(getAddButton());
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
  });

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList({ channels: [channel1] });
    await user.click(getEditButton());
    expect(screen.getByText('EditDialog')).toBeInTheDocument();
  });

  it('calls toggleContactPointActive when toggling active status', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList({ channels: [channel1] });
    await user.click(screen.getByRole('switch', { name: '#general' }));
    expect(queriesMock.toggleContactPointActive).toHaveBeenCalledWith(testOrg, 'slack-1', false);
  });

  it('calls deleteContactPoint when delete is confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderSlackChannelsList({ channels: [channel1] });
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find((btn) => btn.getAttribute('data-color') === 'danger')!;
    await user.click(deleteButton);
    expect(queriesMock.deleteContactPoint).toHaveBeenCalledWith(testOrg, 'slack-1');
  });

  it('calls addContactPoint when saving a new channel', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList();
    await user.click(getAddButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.addContactPoint).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ name: '', isActive: true }),
    );
  });

  it('calls updateContactPoint when saving an edited channel', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList({ channels: [channel1] });
    await user.click(getEditButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.updateContactPoint).toHaveBeenCalledWith(
      testOrg,
      'slack-1',
      expect.objectContaining({ name: '#general' }),
    );
  });
});

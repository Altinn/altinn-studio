import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { SlackChannelsList } from './SlackChannelsList';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

jest.mock('./SlackChannelDialog/SlackChannelDialog', () => ({
  SlackChannelDialog: ({
    editingId,
    onClose,
  }: {
    editingId: string | null;
    onClose: () => void;
  }) => (
    <div>
      <div>{editingId ? 'EditDialog' : 'AddDialog'}</div>
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
  screen.getByRole('button', { name: textMock('settings.orgs.contact_points.add_slack_channel') });

const getEditButton = () =>
  screen.getByRole('button', {
    name: textMock('settings.orgs.contact_points.dialog_edit_slack_title'),
  });

describe('SlackChannelsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the slack heading', () => {
    renderSlackChannelsList();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.slack_heading'),
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
    const deleteButton = screen.getByRole('button', {
      name: textMock('settings.orgs.contact_points.delete', { name: channel1.name }),
    });
    await user.click(deleteButton);
    expect(queriesMock.deleteContactPoint).toHaveBeenCalledWith(testOrg, 'slack-1');
  });

  it('closes the dialog when cancel is clicked inside the dialog', async () => {
    const user = userEvent.setup();
    renderSlackChannelsList();
    await user.click(getAddButton());
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('AddDialog')).not.toBeInTheDocument();
  });

  it('renders description text', () => {
    renderSlackChannelsList();
    expect(
      screen.getByText(textMock('settings.orgs.contact_points.slack_description')),
    ).toBeInTheDocument();
  });
});

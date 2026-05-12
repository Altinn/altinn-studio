import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { BotAccountDialog } from './BotAccountDialog';
import type { BotAccountForm } from './BotAccountDialog';

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';

const emptyForm: BotAccountForm = {
  name: '',
  deployEnvironments: [],
};

const filledForm: BotAccountForm = {
  name: 'deploy_bot',
  deployEnvironments: ['tt02'],
};

type RenderProps = {
  initialForm?: BotAccountForm;
  availableEnvironments?: string[];
  editingId?: string | null;
  onClose?: jest.Mock;
  onCreated?: jest.Mock;
};

const renderBotAccountDialog = ({
  initialForm = emptyForm,
  availableEnvironments = ['tt02', 'production'],
  editingId = null,
  onClose = jest.fn(),
  onCreated = jest.fn(),
}: RenderProps = {}) =>
  renderWithProviders(
    <BotAccountDialog
      org={testOrg}
      initialForm={initialForm}
      availableEnvironments={availableEnvironments}
      onClose={onClose}
      editingId={editingId}
      onCreated={onCreated}
    />,
  );

const getNameInput = () =>
  screen.getByRole('textbox', {
    name: new RegExp(textMock('settings.orgs.bot_accounts.field_name')),
  });
const getAddButton = () => screen.getByRole('button', { name: textMock('general.add') });
const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });
const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });

describe('BotAccountDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the create title when not editing', () => {
    renderBotAccountDialog();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.bot_accounts.create_dialog_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', () => {
    renderBotAccountDialog({ editingId: testBotAccountId, initialForm: filledForm });
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.bot_accounts.edit_dialog_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders add button when not editing', () => {
    renderBotAccountDialog();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders save button when editing', () => {
    renderBotAccountDialog({ editingId: testBotAccountId, initialForm: filledForm });
    expect(getSaveButton()).toBeInTheDocument();
  });

  it('renders the name field', () => {
    renderBotAccountDialog();
    expect(getNameInput()).toBeInTheDocument();
  });

  it('renders environment checkboxes when availableEnvironments is non-empty', () => {
    renderBotAccountDialog();
    expect(screen.getByRole('checkbox', { name: 'tt02' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'production' })).toBeInTheDocument();
  });

  it('does not render environment checkboxes when availableEnvironments is empty', () => {
    renderBotAccountDialog({ availableEnvironments: [] });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders name field as read-only when editing', () => {
    renderBotAccountDialog({ editingId: testBotAccountId, initialForm: filledForm });
    expect(getNameInput()).toHaveAttribute('readonly');
  });

  it('shows required error when submitting with empty name', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog();
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows invalid name error when name contains invalid characters', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog();
    await user.type(getNameInput(), 'Invalid Name!');
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.error_name_invalid')),
    ).toBeInTheDocument();
  });

  it('does not call createBotAccount when name is empty', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog();
    await user.click(getAddButton());
    expect(queriesMock.createBotAccount).not.toHaveBeenCalled();
  });

  it('does not call createBotAccount when name is invalid', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog();
    await user.type(getNameInput(), 'Invalid Name!');
    await user.click(getAddButton());
    expect(queriesMock.createBotAccount).not.toHaveBeenCalled();
  });

  it('calls createBotAccount with valid name', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog();
    await user.type(getNameInput(), 'valid_bot');
    await user.click(getAddButton());
    expect(queriesMock.createBotAccount).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ name: 'valid_bot' }),
    );
  });

  it('calls createBotAccount with null deployEnvironments when none are selected', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog({ availableEnvironments: [] });
    await user.type(getNameInput(), 'valid_bot');
    await user.click(getAddButton());
    expect(queriesMock.createBotAccount).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ deployEnvironments: null }),
    );
  });

  it('calls updateBotAccount when editing and save is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog({ editingId: testBotAccountId, initialForm: filledForm });
    await user.click(getSaveButton());
    expect(queriesMock.updateBotAccount).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      filledForm.deployEnvironments,
    );
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderBotAccountDialog({ onClose });
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles environment checkbox selection', async () => {
    const user = userEvent.setup();
    renderBotAccountDialog({ initialForm: { ...emptyForm, deployEnvironments: [] } });
    const tt02Checkbox = screen.getByRole('checkbox', { name: 'tt02' });
    expect(tt02Checkbox).not.toBeChecked();
    await user.click(tt02Checkbox);
    expect(tt02Checkbox).toBeChecked();
  });

  it('pre-checks environments from initialForm', () => {
    renderBotAccountDialog({ initialForm: filledForm });
    expect(screen.getByRole('checkbox', { name: 'tt02' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'production' })).not.toBeChecked();
  });
});

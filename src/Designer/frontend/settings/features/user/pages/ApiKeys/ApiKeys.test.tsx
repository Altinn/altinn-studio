import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeys } from './ApiKeys';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UserApiKey } from 'app-shared/types/api/UserApiKey';
import type { AddUserApiKeyResponse } from 'app-shared/types/api/AddUserApiKeyResponse';
import { toast } from 'react-toastify';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import { formatLocalDate } from '../../../../components/ApiKeys/ApiKeyDialog';

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: { featureFlags: { studioOidc: true } },
};
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const today = formatLocalDate(new Date());

const maxExpiresAt = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 365);
  return formatLocalDate(d);
})();

const validExpiresAt = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 100);
  return formatLocalDate(d);
})();

const mockApiKeys: UserApiKey[] = [
  {
    id: 1,
    name: 'Existing api key',
    expiresAt: '2099-01-01T00:00:00',
    createdAt: '2024-01-01T00:00:00',
  },
];

const mockNewApiKey: AddUserApiKeyResponse = {
  id: 2,
  key: 'secret-key-value',
  name: 'New api key',
  expiresAt: validExpiresAt,
};

const renderApiKeys = (queries: Parameters<typeof renderWithProviders>[1]['queries'] = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.UserApiKeys], mockApiKeys);
  return renderWithProviders(<ApiKeys />, { queryClient, queries });
};

const getNameInput = () =>
  screen.getByLabelText(textMock('settings.api_keys.field_name'), { exact: false });

const getExpiryInput = () =>
  screen.getByLabelText(textMock('settings.api_keys.field_expires_at'), { exact: false });

const getOpenDialogButton = () =>
  screen.getByRole('button', { name: textMock('settings.api_keys.add') });

const getSubmitButton = () => {
  const buttons = screen.getAllByRole('button', { name: textMock('general.add') });
  return buttons[buttons.length - 1];
};

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(getOpenDialogButton());
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>, name: string, date: string) => {
  await user.type(getNameInput(), name);
  await user.clear(getExpiryInput());
  await user.type(getExpiryInput(), date);
};

const getDeleteButton = (name: string) =>
  screen.getByRole('button', { name: textMock('settings.api_keys.delete', { name }) });

describe('ApiKeys', () => {
  beforeEach(() => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the not-found page when studioOidc is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderApiKeys();
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the open dialog button', () => {
    renderApiKeys();
    expect(getOpenDialogButton()).toBeInTheDocument();
  });

  it('renders the form after opening the dialog', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    expect(getNameInput()).toBeInTheDocument();
    expect(getExpiryInput()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('sets min to today and max to 365 days from today on the expiry input', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    const expiryInput = getExpiryInput();
    expect(expiryInput).toHaveAttribute('min', today);
    expect(expiryInput).toHaveAttribute('max', maxExpiresAt);
  });

  it('defaults the expiry input to the max date (365 days from today)', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    expect(getExpiryInput()).toHaveValue(maxExpiresAt);
  });

  it('shows required error only for name when submitting with default expiry', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    await user.click(getSubmitButton());
    expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(1);
  });

  it('shows required error for expiry when submitting with empty expiry', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    await user.clear(getExpiryInput());
    await user.click(getSubmitButton());
    expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(2);
  });

  it('resets expiry to the max date after successful api key creation', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await user.type(getNameInput(), 'New api key');
    await user.click(getSubmitButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    await openDialog(user);
    expect(getExpiryInput()).toHaveValue(maxExpiresAt);
  });

  it('shows duplicate name error when name already exists', async () => {
    const user = userEvent.setup();
    renderApiKeys();
    await openDialog(user);
    await fillForm(user, 'Existing api key', validExpiresAt);
    await user.click(getSubmitButton());
    expect(
      screen.getByText(textMock('settings.api_keys.error_duplicate_name')),
    ).toBeInTheDocument();
  });

  it('shows duplicate name error when server returns 409 Conflict', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockRejectedValue({
      response: { status: 409, data: { errorCode: ApiErrorCodes.DuplicateTokenName } },
    });
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    expect(
      await screen.findByText(textMock('settings.api_keys.error_duplicate_name')),
    ).toBeInTheDocument();
    await user.type(getNameInput(), ' 2');
    expect(
      screen.queryByText(textMock('settings.api_keys.error_duplicate_name')),
    ).not.toBeInTheDocument();
  });

  it('calls addUserApiKey with correct payload', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    expect(addUserApiKey).toHaveBeenCalledWith({
      name: 'New api key',
      expiresAt: `${validExpiresAt}T23:59:59Z`,
    });
  });

  it('shows the new api key after successful creation', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    expect(await screen.findByDisplayValue('secret-key-value')).toBeInTheDocument();
  });

  it('closes the success dialog when the dialog close button is clicked', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    expect(screen.queryByDisplayValue('secret-key-value')).not.toBeInTheDocument();
  });

  it('copies the api key to clipboard and shows success toast when copy button is clicked', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.copy') }));
    expect(writeText).toHaveBeenCalledWith('secret-key-value');
    expect(toast.success).toHaveBeenCalledWith(
      textMock('settings.api_keys.copy_success'),
      expect.objectContaining({ toastId: 'settings.api_keys.copy_success' }),
    );
  });

  it('shows error toast when clipboard write fails', async () => {
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockNewApiKey);
    renderApiKeys({ addUserApiKey });
    await openDialog(user);
    await fillForm(user, 'New api key', validExpiresAt);
    await user.click(getSubmitButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.copy') }));
    expect(toast.error).toHaveBeenCalledWith(
      textMock('settings.api_keys.copy_error'),
      expect.objectContaining({ toastId: 'settings.api_keys.copy_error' }),
    );
  });

  it('renders loading spinner while api keys are pending', () => {
    const queryClient = createQueryClientMock();
    renderWithProviders(<ApiKeys />, { queryClient });
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders error message when api keys query fails', async () => {
    const getUserApiKeys = jest.fn().mockRejectedValue(new Error('Failed'));
    const queryClient = createQueryClientMock();
    renderWithProviders(<ApiKeys />, { queryClient, queries: { getUserApiKeys } });
    expect(await screen.findByText(textMock('settings.api_keys.load_error'))).toBeInTheDocument();
  });

  it('renders existing api keys in the table', () => {
    renderApiKeys();
    expect(screen.getByText('Existing api key')).toBeInTheDocument();
  });

  it('calls deleteUserApiKey when delete is confirmed', async () => {
    const deleteUserApiKey = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const user = userEvent.setup();
    renderApiKeys({ deleteUserApiKey });
    await user.click(getDeleteButton('Existing api key'));
    expect(deleteUserApiKey).toHaveBeenCalledWith(mockApiKeys[0].id);
  });

  it('does not render the created-by column (showCreatedBy is false for user api keys)', () => {
    renderApiKeys();
    expect(
      screen.queryByRole('columnheader', { name: textMock('settings.api_keys.col_created_by') }),
    ).not.toBeInTheDocument();
  });

  it('renders the page heading', () => {
    renderApiKeys();
    expect(
      screen.getByRole('heading', { name: textMock('settings.user.api_keys.api_keys') }),
    ).toBeInTheDocument();
  });
});

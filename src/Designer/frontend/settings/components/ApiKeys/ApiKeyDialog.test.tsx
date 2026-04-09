import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { ApiKeyDialog, formatLocalDate, computeMaxExpiresAt } from './ApiKeyDialog';
import { toast } from 'react-toastify';

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const today = formatLocalDate(new Date());
const maxDate = computeMaxExpiresAt();

type RenderProps = {
  newApiKey?: string | null;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
  isSaving?: boolean;
  onNameChange?: jest.Mock;
  isDuplicateName?: (name: string) => boolean;
};

const renderApiKeyDialog = ({
  newApiKey = null,
  onSave = jest.fn(),
  onClose = jest.fn(),
  isSaving = false,
  onNameChange,
  isDuplicateName,
}: RenderProps = {}) =>
  renderWithProviders(
    <ApiKeyDialog
      newApiKey={newApiKey}
      onSave={onSave}
      onClose={onClose}
      isSaving={isSaving}
      onNameChange={onNameChange}
      isDuplicateName={isDuplicateName}
    />,
  );

const getNameInput = () =>
  screen.getByLabelText(textMock('settings.api_keys.field_name'), { exact: false });
const getExpiryInput = () =>
  screen.getByLabelText(textMock('settings.api_keys.field_expires_at'), { exact: false });
const getAddButton = () => screen.getByRole('button', { name: textMock('general.add') });
const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });

describe('ApiKeyDialog', () => {
  afterEach(() => jest.clearAllMocks());

  describe('form state (no newApiKey)', () => {
    it('renders the dialog title', () => {
      renderApiKeyDialog();
      expect(
        screen.getByRole('heading', { name: textMock('settings.api_keys.add') }),
      ).toBeInTheDocument();
    });

    it('renders the name and expiry fields', () => {
      renderApiKeyDialog();
      expect(getNameInput()).toBeInTheDocument();
      expect(getExpiryInput()).toBeInTheDocument();
    });

    it('defaults expiry to max date (365 days from today)', () => {
      renderApiKeyDialog();
      expect(getExpiryInput()).toHaveValue(maxDate);
    });

    it('sets min to today and max to 365 days on expiry input', () => {
      renderApiKeyDialog();
      const expiryInput = getExpiryInput();
      expect(expiryInput).toHaveAttribute('min', today);
      expect(expiryInput).toHaveAttribute('max', maxDate);
    });

    it('shows required errors when submitting with empty fields', async () => {
      const user = userEvent.setup();
      renderApiKeyDialog();
      await user.clear(getExpiryInput());
      await user.click(getAddButton());
      expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(2);
    });

    it('shows only name required error when expiry already filled', async () => {
      const user = userEvent.setup();
      renderApiKeyDialog();
      await user.click(getAddButton());
      expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(1);
    });

    it('calls onSave with trimmed name and expiresAt when form is valid', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onSave });
      await user.type(getNameInput(), '  My Key  ');
      await user.click(getAddButton());
      expect(onSave).toHaveBeenCalledWith('My Key', maxDate);
    });

    it('does not call onSave when name is empty', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onSave });
      await user.click(getAddButton());
      expect(onSave).not.toHaveBeenCalled();
    });

    it('does not call onSave when isDuplicateName returns true', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onSave, isDuplicateName: () => true });
      await user.type(getNameInput(), 'Existing Key');
      await user.click(getAddButton());
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows duplicate name error when isDuplicateName returns true after submit', async () => {
      const user = userEvent.setup();
      renderApiKeyDialog({ isDuplicateName: () => true });
      await user.type(getNameInput(), 'Existing Key');
      await user.click(getAddButton());
      expect(
        screen.getByText(textMock('settings.api_keys.error_duplicate_name')),
      ).toBeInTheDocument();
    });

    it('calls onNameChange when name input changes', async () => {
      const onNameChange = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onNameChange });
      await user.type(getNameInput(), 'a');
      expect(onNameChange).toHaveBeenCalled();
    });

    it('resets form state and calls onClose when cancel is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onClose });
      await user.type(getNameInput(), 'My Key');
      await user.click(getCancelButton());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(getNameInput()).toHaveValue('');
      expect(getExpiryInput()).toHaveValue(maxDate);
    });

    it('resets submitted state when cancel is clicked (no lingering errors)', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ onClose });
      await user.click(getAddButton());
      expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
      await user.click(getCancelButton());
      expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
    });
  });

  describe('new api key display (newApiKey provided)', () => {
    const newKey = 'secret-api-key-value';

    it('renders the new key heading', () => {
      renderApiKeyDialog({ newApiKey: newKey });
      expect(
        screen.getByRole('heading', { name: textMock('settings.api_keys.new_key_title') }),
      ).toBeInTheDocument();
    });

    it('renders the new api key value in a readonly field', () => {
      renderApiKeyDialog({ newApiKey: newKey });
      expect(screen.getByDisplayValue(newKey)).toBeInTheDocument();
    });

    it('renders the copy button', () => {
      renderApiKeyDialog({ newApiKey: newKey });
      expect(
        screen.getByRole('button', { name: textMock('settings.api_keys.copy') }),
      ).toBeInTheDocument();
    });

    it('renders the close button', () => {
      renderApiKeyDialog({ newApiKey: newKey });
      expect(screen.getByRole('button', { name: textMock('general.close') })).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ newApiKey: newKey, onClose });
      await user.click(screen.getByRole('button', { name: textMock('general.close') }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('copies the key and shows success toast when copy button is clicked', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
      const onClose = jest.fn();
      const user = userEvent.setup();
      renderApiKeyDialog({ newApiKey: newKey, onClose });
      await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.copy') }));
      expect(writeText).toHaveBeenCalledWith(newKey);
      expect(toast.success).toHaveBeenCalledWith(
        textMock('settings.api_keys.copy_success'),
        expect.objectContaining({ toastId: 'settings.api_keys.copy_success' }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows error toast when clipboard write fails', async () => {
      jest
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(new Error('Permission denied'));
      const user = userEvent.setup();
      renderApiKeyDialog({ newApiKey: newKey });
      await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.copy') }));
      expect(toast.error).toHaveBeenCalledWith(
        textMock('settings.api_keys.copy_error'),
        expect.objectContaining({ toastId: 'settings.api_keys.copy_error' }),
      );
    });

    it('does not copy when newApiKey is null (handleCopy guard)', () => {
      const writeText = jest.fn();
      jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
      // Render form state (newApiKey = null), copy button does not exist
      renderApiKeyDialog({ newApiKey: null });
      expect(
        screen.queryByRole('button', { name: textMock('settings.api_keys.copy') }),
      ).not.toBeInTheDocument();
      expect(writeText).not.toHaveBeenCalled();
    });
  });
});

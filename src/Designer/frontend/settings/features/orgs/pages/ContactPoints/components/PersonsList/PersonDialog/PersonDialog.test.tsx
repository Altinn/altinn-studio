import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import { PersonDialog } from './PersonDialog';
import type { Person } from './PersonDialog';

const org = 'ttd';

const defaultPerson: Person = {
  name: '',
  email: '',
  phone: '',
  isActive: true,
  environments: [],
};

type RenderProps = {
  initialValue?: Person;
  availableEnvironments?: string[];
  editingId?: string | null;
  onClose?: jest.Mock;
};

const renderPersonDialog = ({
  initialValue = defaultPerson,
  availableEnvironments = ['tt02', 'production'],
  editingId = null,
  onClose = jest.fn(),
}: RenderProps = {}) =>
  renderWithProviders(
    <PersonDialog
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
const getNameInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('settings.orgs.contact_points.field_name')} ${textMock('general.required')}`,
  });
const getEmailInput = () =>
  screen.getByRole('textbox', { name: textMock('settings.orgs.contact_points.field_email') });
const getPhoneInput = () =>
  screen.getByRole('textbox', { name: textMock('settings.orgs.contact_points.field_phone') });

describe('PersonDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', () => {
    renderPersonDialog();
    expect(
      screen.getByRole('heading', { name: textMock('settings.orgs.contact_points.add_contact') }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', () => {
    renderPersonDialog({ editingId: 'person-1' });
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.dialog_edit_person_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders add button when not editing', () => {
    renderPersonDialog();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders save button when editing', () => {
    renderPersonDialog({ editingId: 'person-1' });
    expect(getSaveButton()).toBeInTheDocument();
  });

  it('renders the name, email, and phone fields', () => {
    renderPersonDialog();
    expect(getNameInput()).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPhoneInput()).toBeInTheDocument();
  });

  it('calls addContactPoint when saving a new valid person', async () => {
    const user = userEvent.setup();
    renderPersonDialog();
    await user.type(getNameInput(), 'Test');
    await user.type(getEmailInput(), 'test@example.com');
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).toHaveBeenCalledWith(
      org,
      expect.objectContaining({ name: 'Test' }),
    );
  });

  it('calls updateContactPoint when saving an edited person', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      initialValue: {
        name: 'Test',
        email: 'test@example.com',
        phone: '',
        isActive: true,
        environments: [],
      },
      editingId: 'person-1',
    });
    await user.click(getSaveButton());
    expect(queriesMock.updateContactPoint).toHaveBeenCalledWith(
      org,
      'person-1',
      expect.objectContaining({ name: 'Test' }),
    );
  });

  it('does not call addContactPoint when name is missing', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, email: 'test@example.com' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('does not call addContactPoint when both email and phone are missing', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('shows name required error after submit with empty name', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, email: 'test@example.com' } });
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows contact method required error after submit with no email and no phone', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test' } });
    await user.click(getAddButton());
    expect(
      screen.getAllByText(textMock('settings.orgs.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('keeps submit validation active after field changes', async () => {
    const user = userEvent.setup();
    renderPersonDialog();
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    await user.type(getNameInput(), 'Test');
    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
    expect(
      screen.getAllByText(textMock('settings.orgs.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({ onClose });
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('accepts phone as valid contact method (no email needed)', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', phone: '12345678' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).toHaveBeenCalled();
  });

  it('shows invalid email error when email is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', email: 'not-an-email' } });
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.invalid_email'))).toBeInTheDocument();
  });

  it('does not call addContactPoint when email is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', email: 'not-an-email' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('shows invalid phone error when phone is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', phone: 'abc' } });
    await user.click(getAddButton());
    expect(screen.getByText(textMock('validation_errors.invalid_phone'))).toBeInTheDocument();
  });

  it('does not call addContactPoint when phone is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', phone: 'abc' } });
    await user.click(getAddButton());
    expect(queriesMock.addContactPoint).not.toHaveBeenCalled();
  });

  it('does not show email format error when email field is empty', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ initialValue: { ...defaultPerson, name: 'Test', phone: '12345678' } });
    await user.click(getAddButton());
    expect(screen.queryByText(textMock('validation_errors.invalid_email'))).not.toBeInTheDocument();
  });

  it('does not show phone format error when phone field is empty', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      initialValue: { ...defaultPerson, name: 'Test', email: 'test@example.com' },
    });
    await user.click(getAddButton());
    expect(screen.queryByText(textMock('validation_errors.invalid_phone'))).not.toBeInTheDocument();
  });
});

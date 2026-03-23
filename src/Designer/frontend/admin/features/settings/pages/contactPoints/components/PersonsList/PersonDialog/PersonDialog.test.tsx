import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PersonDialog } from './PersonDialog';

type PersonDraft = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
};

type TestWrapperProps = {
  person?: PersonDraft;
  onFieldChange?: jest.Mock;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
  isEditing?: boolean;
  isSaving?: boolean;
};

const defaultPerson: PersonDraft = { name: '', email: '', phone: '', isActive: true };

function PersonDialogWrapper({
  person = defaultPerson,
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
      <PersonDialog
        dialogRef={dialogRef}
        person={person}
        onFieldChange={onFieldChange}
        onSave={onSave}
        onClose={onClose}
        isEditing={isEditing}
        isSaving={isSaving}
      />
    </>
  );
}

const renderPersonDialog = async (props: TestWrapperProps = {}) => {
  const user = userEvent.setup();
  render(<PersonDialogWrapper {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return user;
};

const getSaveButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.save') });

const getCancelButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.cancel') });

describe('PersonDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', async () => {
    await renderPersonDialog();
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.dialog_add_person_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', async () => {
    await renderPersonDialog({ isEditing: true });
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.dialog_edit_person_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the name, email, and phone fields', async () => {
    await renderPersonDialog();
    expect(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_name'),
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_email'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_phone'),
      }),
    ).toBeInTheDocument();
  });

  it('calls onFieldChange when name input changes', async () => {
    const onFieldChange = jest.fn();
    const user = await renderPersonDialog({ onFieldChange });
    await user.type(
      screen.getByRole('textbox', {
        name: textMock('org.settings.contact_points.field_name'),
        exact: false,
      }),
      'Alice',
    );
    expect(onFieldChange).toHaveBeenCalledWith('name', expect.any(String));
  });

  it('calls onFieldChange when email input changes', async () => {
    const onFieldChange = jest.fn();
    const user = await renderPersonDialog({ onFieldChange });
    await user.type(
      screen.getByRole('textbox', { name: textMock('org.settings.contact_points.field_email') }),
      'alice@example.com',
    );
    expect(onFieldChange).toHaveBeenCalledWith('email', expect.any(String));
  });

  it('calls onFieldChange when phone input changes', async () => {
    const onFieldChange = jest.fn();
    const user = await renderPersonDialog({ onFieldChange });
    await user.type(
      screen.getByRole('textbox', { name: textMock('org.settings.contact_points.field_phone') }),
      '12345678',
    );
    expect(onFieldChange).toHaveBeenCalledWith('phone', expect.any(String));
  });

  it('calls onSave when saving with valid data', async () => {
    const onSave = jest.fn();
    const user = await renderPersonDialog({
      onSave,
      person: { name: 'Alice', email: 'alice@example.com', phone: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when name is missing', async () => {
    const onSave = jest.fn();
    const user = await renderPersonDialog({
      onSave,
      person: { name: '', email: 'alice@example.com', phone: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when both email and phone are missing', async () => {
    const onSave = jest.fn();
    const user = await renderPersonDialog({
      onSave,
      person: { name: 'Alice', email: '', phone: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows name required error after submit with empty name', async () => {
    const user = await renderPersonDialog({
      person: { name: '', email: 'alice@example.com', phone: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows contact method required error after submit with no email and no phone', async () => {
    const user = await renderPersonDialog({
      person: { name: 'Alice', email: '', phone: '', isActive: true },
    });
    await user.click(getSaveButton());
    expect(
      screen.getAllByText(textMock('org.settings.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = await renderPersonDialog({ onClose });
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('accepts phone as valid contact method (no email needed)', async () => {
    const onSave = jest.fn();
    const user = await renderPersonDialog({
      onSave,
      person: { name: 'Alice', email: '', phone: '12345678', isActive: true },
    });
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

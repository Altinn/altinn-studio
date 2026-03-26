import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PersonDialog } from './PersonDialog';

import type { Person } from './PersonDialog';

type TestWrapperProps = {
  person?: Person;
  availableEnvironments?: string[];
  onFieldChange?: jest.Mock;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
  isEditing?: boolean;
  isSaving?: boolean;
};

const defaultPerson: Person = {
  name: '',
  email: '',
  phone: '',
  isActive: true,
  environments: [],
};

function PersonDialogWrapper({
  person = defaultPerson,
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
      <PersonDialog
        dialogRef={dialogRef}
        person={person}
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

function PersonDialogStatefulWrapper({
  person = defaultPerson,
  availableEnvironments = ['tt02', 'production'],
  onSave = jest.fn(),
  onClose = jest.fn(),
  isEditing = false,
  isSaving = false,
}: Omit<TestWrapperProps, 'onFieldChange'>): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPerson, setCurrentPerson] = useState(person);

  const handleFieldChange = (field: keyof Person, value: string | boolean | string[]) => {
    setCurrentPerson((prev) => ({ ...prev, [field]: value as never }));
  };

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()}>Open</button>
      <PersonDialog
        dialogRef={dialogRef}
        person={currentPerson}
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
  screen.getByRole('button', { name: textMock('org.settings.contact_points.save') });

const getCancelButton = () =>
  screen.getByRole('button', { name: textMock('org.settings.contact_points.cancel') });

const getNameInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('org.settings.contact_points.field_name')} ${textMock('general.required')}`,
  });

const renderPersonDialog = (props: TestWrapperProps = {}) => {
  render(<PersonDialogWrapper {...props} />);
};

describe('PersonDialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add title when not editing', async () => {
    const user = userEvent.setup();
    renderPersonDialog();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.add_contact'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the edit title when editing', async () => {
    const user = userEvent.setup();
    renderPersonDialog({ isEditing: true });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByRole('heading', {
        name: textMock('org.settings.contact_points.dialog_edit_person_title'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the name, email, and phone fields', async () => {
    const user = userEvent.setup();
    renderPersonDialog();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(getNameInput()).toBeInTheDocument();
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
    const user = userEvent.setup();
    renderPersonDialog({ onFieldChange });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(getNameInput(), 'Test');
    expect(onFieldChange).toHaveBeenCalledWith('name', expect.any(String));
  });

  it('calls onFieldChange when email input changes', async () => {
    const onFieldChange = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({ onFieldChange });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(
      screen.getByRole('textbox', { name: textMock('org.settings.contact_points.field_email') }),
      'test@example.com',
    );
    expect(onFieldChange).toHaveBeenCalledWith('email', expect.any(String));
  });

  it('calls onFieldChange when phone input changes', async () => {
    const onFieldChange = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({ onFieldChange });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(
      screen.getByRole('textbox', { name: textMock('org.settings.contact_points.field_phone') }),
      '12345678',
    );
    expect(onFieldChange).toHaveBeenCalledWith('phone', expect.any(String));
  });

  it('calls onSave when saving with valid data', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: {
        name: 'Test',
        email: 'test@example.com',
        phone: '',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when name is missing', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: { name: '', email: 'test@example.com', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when both email and phone are missing', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: { name: 'Test', email: '', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows name required error after submit with empty name', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: { name: '', email: 'test@example.com', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('shows contact method required error after submit with no email and no phone', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: { name: 'Test', email: '', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(
      screen.getAllByText(textMock('org.settings.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('keeps submit validation active after field changes', async () => {
    const user = userEvent.setup();

    render(<PersonDialogStatefulWrapper />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    expect(
      screen.getAllByText(textMock('org.settings.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);

    await user.type(getNameInput(), 'Test');

    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
    expect(
      screen.getAllByText(textMock('org.settings.contact_points.error_contact_method_required'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({ onClose });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getCancelButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('accepts phone as valid contact method (no email needed)', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: { name: 'Test', email: '', phone: '12345678', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows invalid email error when email is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: { name: 'Test', email: 'not-an-email', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.invalid_email'))).toBeInTheDocument();
  });

  it('does not call onSave when email is malformed', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: { name: 'Test', email: 'not-an-email', phone: '', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows invalid phone error when phone is malformed', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: { name: 'Test', email: '', phone: 'abc', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.getByText(textMock('validation_errors.invalid_phone'))).toBeInTheDocument();
  });

  it('does not call onSave when phone is malformed', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    renderPersonDialog({
      onSave,
      person: { name: 'Test', email: '', phone: 'abc', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not show email format error when email field is empty', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: { name: 'Test', email: '', phone: '12345678', isActive: true, environments: [] },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.queryByText(textMock('validation_errors.invalid_email'))).not.toBeInTheDocument();
  });

  it('does not show phone format error when phone field is empty', async () => {
    const user = userEvent.setup();
    renderPersonDialog({
      person: {
        name: 'Test',
        email: 'test@example.com',
        phone: '',
        isActive: true,
        environments: [],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(getSaveButton());
    expect(screen.queryByText(textMock('validation_errors.invalid_phone'))).not.toBeInTheDocument();
  });

  it('updates checked environments when person prop changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <PersonDialogWrapper
        person={{
          name: 'Test',
          email: 'test@example.com',
          phone: '',
          isActive: true,
          environments: ['tt02'],
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('checkbox', { name: 'tt02' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'production' })).not.toBeChecked();

    rerender(
      <PersonDialogWrapper
        person={{
          name: 'Test',
          email: 'test@example.com',
          phone: '',
          isActive: true,
          environments: ['production'],
        }}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'tt02' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'production' })).toBeChecked();
  });
});

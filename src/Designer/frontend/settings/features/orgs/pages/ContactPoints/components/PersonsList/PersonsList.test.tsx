import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PersonsList } from './PersonsList';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

jest.mock('./PersonDialog/PersonDialog', () => ({
  PersonDialog: ({
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

const person1: ContactPoint = {
  id: 'person-1',
  name: 'Test 1',
  isActive: true,
  environments: ['tt02'],
  methods: [
    { id: 'm1', methodType: 'email', value: 'test@example.com' },
    { id: 'm2', methodType: 'sms', value: '12345678' },
  ],
};

const person2: ContactPoint = {
  id: 'person-2',
  name: 'Test 2',
  isActive: false,
  environments: [],
  methods: [{ id: 'm3', methodType: 'email', value: 'bob@example.com' }],
};

const defaultProps: { org: string; persons: ContactPoint[] } = {
  org: testOrg,
  persons: [],
};

const renderPersonsList = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<PersonsList {...defaultProps} {...props} />);

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('settings.orgs.contact_points.add_contact') });

const getEditButton = () =>
  screen.getByRole('button', {
    name: textMock('settings.orgs.contact_points.dialog_edit_person_title'),
  });

describe('PersonsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the persons heading', () => {
    renderPersonsList();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.contact_points.persons_heading'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the add contact button', () => {
    renderPersonsList();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders persons in the table', () => {
    renderPersonsList({ persons: [person1, person2] });
    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('Test 2')).toBeInTheDocument();
  });

  it('renders email and phone values for persons', () => {
    renderPersonsList({ persons: [person1] });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
  });

  it('renders a switch for each person with their name as aria-label', () => {
    renderPersonsList({ persons: [person1, person2] });
    expect(screen.getByRole('switch', { name: 'Test 1' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Test 2' })).not.toBeChecked();
  });

  it('opens add dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    renderPersonsList();
    await user.click(getAddButton());
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
  });

  it('opens edit dialog with person data when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderPersonsList({ persons: [person1] });
    await user.click(getEditButton());
    expect(screen.getByText('EditDialog')).toBeInTheDocument();
  });

  it('calls toggleContactPointActive when toggling active status', async () => {
    const user = userEvent.setup();
    renderPersonsList({ persons: [person1] });
    await user.click(screen.getByRole('switch', { name: 'Test 1' }));
    expect(queriesMock.toggleContactPointActive).toHaveBeenCalledWith(testOrg, 'person-1', false);
  });

  it('calls deleteContactPoint when delete is confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderPersonsList({ persons: [person1] });
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find((btn) => btn.getAttribute('data-color') === 'danger')!;
    await user.click(deleteButton);
    expect(queriesMock.deleteContactPoint).toHaveBeenCalledWith(testOrg, 'person-1');
  });

  it('calls addContactPoint when saving a new person', async () => {
    const user = userEvent.setup();
    renderPersonsList();
    await user.click(getAddButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.addContactPoint).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ name: '', isActive: true }),
    );
  });

  it('calls updateContactPoint when saving an edited person', async () => {
    const user = userEvent.setup();
    renderPersonsList({ persons: [person1] });
    await user.click(getEditButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.updateContactPoint).toHaveBeenCalledWith(
      testOrg,
      'person-1',
      expect.objectContaining({ name: 'Test 1' }),
    );
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PersonsList } from './PersonsList';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

jest.mock('./PersonDialog/PersonDialog', () => ({
  PersonDialog: ({ editingId, onClose }: { editingId: string | null; onClose: () => void }) => (
    <div>
      <div>{editingId ? 'EditDialog' : 'AddDialog'}</div>
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
    const deleteButton = screen.getByRole('button', {
      name: textMock('settings.orgs.contact_points.delete', { name: person1.name }),
    });
    await user.click(deleteButton);
    expect(queriesMock.deleteContactPoint).toHaveBeenCalledWith(testOrg, 'person-1');
  });

  it('closes the dialog when cancel is clicked inside the dialog', async () => {
    const user = userEvent.setup();
    renderPersonsList();
    await user.click(getAddButton());
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('AddDialog')).not.toBeInTheDocument();
  });

  it('renders description text', () => {
    renderPersonsList();
    expect(
      screen.getByText(textMock('settings.orgs.contact_points.persons_description')),
    ).toBeInTheDocument();
  });
});

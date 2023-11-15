import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { CreateService } from './CreateService';
import { User } from 'app-shared/types/User';
import { IGiteaOrganisation, IRepository } from 'app-shared/types/global';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const org: IGiteaOrganisation = {
  avatar_url: '',
  id: 1,
  username: 'unit-test',
  full_name: 'unit-test',
};

const repositoryMock: IRepository = {
  clone_url: '',
  description: '',
  full_name: 'test',
  html_url: '',
  id: 0,
  is_cloned_to_local: false,
  user_has_starred: false,
  name: 'test',
  owner: {
    avatar_url: '',
    full_name: '',
    login: '',
  },
  updated_at: '',
};

const userMock: User = {
  id: 1,
  avatar_url: '',
  email: 'tester@tester.test',
  full_name: 'Tester Testersen',
  login: 'tester',
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const renderWithMockServices = (
  services?: Partial<ServicesContextProps>,
  organizations?: IGiteaOrganisation[],
  user?: User,
) => {
  render(
    <MockServicesContextWrapper client={null} customServices={services}>
      <CreateService
        organizations={organizations || []}
        user={
          user || {
            id: 1,
            avatar_url: '',
            email: '',
            full_name: '',
            login: '',
          }
        }
      />
    </MockServicesContextWrapper>,
  );
};

const originalWindowLocation = window.location;

describe('CreateService', () => {
  const windowLocationAssignMock = jest.fn();
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      assign: windowLocationAssignMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalWindowLocation;
  });

  test('should show error messages when clicking create and no owner or name is filled in', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    await act(() => user.click(createBtn));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.field_cannot_be_empty'),
    );
    expect(emptyFieldErrors.length).toBe(2);
  });

  test('should prefill owner when there are no available orgs, and the only available user is the logged in user', async () => {
    renderWithMockServices();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  test('should show error message that app name is too long when it exceeds max length', async () => {
    const user = userEvent.setup();
    renderWithMockServices();
    await act(() =>
      user.type(screen.getByLabelText(/general.service_name/), 'this-app-name-is-longer-than-max'),
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_is_too_long'),
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show error message that app name is invalid when it contains invalid characters', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'datamodels'),
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show error message that app already exists when trying to create an app with a name that already exists', async () => {
    const user = userEvent.setup();
    const addRepoMock = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: { status: 409 } }));

    renderWithMockServices({ addRepo: addRepoMock }, [org]);

    await act(() =>
      user.click(screen.getByRole('combobox', { name: textMock('general.service_owner') })),
    );
    await act(() => user.click(screen.getByRole('option', { name: 'unit-test' })));

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'this-app-name-exists'),
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    expect(addRepoMock).rejects.toEqual({ response: { status: 409 } });

    const emptyFieldErrors = await screen.findAllByText(textMock('dashboard.app_already_exists'));
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show generic error message when trying to create an app and something unknown went wrong', async () => {
    const user = userEvent.setup();
    const org: IGiteaOrganisation = {
      avatar_url: '',
      id: 1,
      username: 'unit-test',
      full_name: 'unit-test',
    };

    const addRepoMock = jest.fn(() => Promise.reject({ response: { status: 500 } }));
    renderWithMockServices({ addRepo: addRepoMock }, [org]);

    await act(() => user.click(screen.getByRole('combobox')));
    await act(() => user.click(screen.getByRole('option', { name: 'unit-test' })));
    await act(() => user.type(screen.getByLabelText(textMock('general.service_name')), 'new-app'));

    const createButton = await screen.findByText(textMock('dashboard.create_service_btn'));
    await act(() => user.click(createButton));

    await expect(addRepoMock).rejects.toEqual({ response: { status: 500 } });

    const emptyFieldErrors = await screen.findAllByText(textMock('general.error_message'));
    expect(emptyFieldErrors.length).toBe(1);
  });

  it.only('should navigate to app-development if creating the app was successful', async () => {
    const user = userEvent.setup();

    renderWithMockServices(
      {
        addRepo: () => Promise.resolve(repositoryMock),
      },
      [org],
      userMock,
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    const appNameInput = screen.getByLabelText(textMock('general.service_name'));
    await act(() => user.type(appNameInput, 'appname'));
    await act(() => user.click(createBtn));

    expect(windowLocationAssignMock).toHaveBeenCalled();
  });

  it('navigate back button should be a link with "/" as path', async () => {
    renderWithMockServices();
    const backButton = screen.getByRole('link', { name: /general.cancel/ });
    expect(backButton).toHaveAttribute('href', '/');
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { CreateService } from './CreateService';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { repository, user as userMock } from 'app-shared/mocks/mocks';
import { useParams } from 'react-router-dom';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { Subroute } from '../../enums/Subroute';
import { SelectedContextType } from '../../enums/SelectedContextType';

const orgMock: Organization = {
  avatar_url: '',
  id: 1,
  username: 'unit-test',
  full_name: 'unit-test',
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams: jest.fn().mockReturnValue(''),
}));

const mockUserLogin: string = 'test';
const mockUser: User = {
  id: 1,
  avatar_url: '',
  email: '',
  full_name: '',
  login: mockUserLogin,
  userType: 0,
};

type RenderWithMockServicesProps = {
  services?: Partial<ServicesContextProps>;
  organizations?: Organization[];
  user?: User;
};

const renderWithMockServices = ({
  services,
  organizations,
  user,
}: RenderWithMockServicesProps = {}) => {
  render(
    <MockServicesContextWrapper client={null} customServices={services}>
      <CreateService organizations={organizations || []} user={user || mockUser} />
    </MockServicesContextWrapper>,
  );
};

const originalWindowLocation = window.location;

describe('CreateService', () => {
  const windowLocationAssignMock = jest.fn();
  beforeEach(() => {
    delete window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalWindowLocation,
        assign: windowLocationAssignMock,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalWindowLocation,
    });
  });

  it('should show error messages when clicking create and no owner or name is filled in', async () => {
    const user = userEvent.setup();
    const selectedContext = SelectedContextType.None;
    const subroute = Subroute.AppDashboard;
    (useParams as jest.Mock).mockReturnValue({ selectedContext, subroute });
    renderWithMockServices({ user: { ...mockUser, login: '' } });

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    await user.click(createBtn);

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.field_cannot_be_empty'),
    );
    expect(emptyFieldErrors.length).toBe(2);
  });

  it('should prefill owner when there are no available orgs, and the only available user is the logged in user', async () => {
    renderWithMockServices();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('should show error message that app name is too long when it exceeds max length', async () => {
    const user = userEvent.setup();
    renderWithMockServices();
    await user.type(
      screen.getByLabelText(/general.service_name/),
      'this-app-name-is-longer-than-max',
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await user.click(createBtn);

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_is_too_long'),
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  it('should show error message that app name is invalid when it contains invalid characters', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    await user.type(screen.getByLabelText(textMock('general.service_name')), 'dataModels');

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await user.click(createBtn);

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  it('should show error message that app name is invalid when name is to short, then remove the error when name is valid again', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const repoNameInput = screen.getByLabelText(textMock('general.service_name'));

    await user.type(repoNameInput, 'aa');

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await user.click(createBtn);

    const errorMessage = screen.getByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessage).toBeInTheDocument();

    await user.type(repoNameInput, 'a');

    const errorMessageAfter = screen.queryByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessageAfter).not.toBeInTheDocument();
  });

  it('should show error message that app already exists when trying to create an app with a name that already exists', async () => {
    const user = userEvent.setup();
    const axiosError = createApiErrorMock(ServerCodes.Conflict);
    const addRepoMock = jest.fn().mockImplementation(() => Promise.reject(axiosError));

    renderWithMockServices({ services: { addRepo: addRepoMock }, organizations: [orgMock] });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUserLogin });
    await user.click(orgOption);

    await user.type(
      screen.getByLabelText(textMock('general.service_name')),
      'this-app-name-exists',
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await user.click(createBtn);

    expect(addRepoMock).rejects.toEqual(axiosError);

    await screen.findByText(textMock('dashboard.app_already_exists'));
  });

  it('should show generic error message when trying to create an app and something unknown went wrong', async () => {
    const user = userEvent.setup();
    const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
    const addRepoMock = jest.fn(() => Promise.reject(axiosError));
    renderWithMockServices({ services: { addRepo: addRepoMock }, organizations: [orgMock] });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUserLogin });
    await user.click(orgOption);

    await user.type(screen.getByLabelText(textMock('general.service_name')), 'new-app');

    const createButton = await screen.findByText(textMock('dashboard.create_service_btn'));
    await user.click(createButton);

    await expect(addRepoMock).rejects.toEqual(axiosError);

    const emptyFieldErrors = await screen.findAllByText(textMock('general.error_message'));
    expect(emptyFieldErrors.length).toBe(1);
  });

  it('should display loading while the form is processing', async () => {
    const user = userEvent.setup();

    renderWithMockServices({
      services: {
        // Use setTimeout as a workaround to trigger isLoading on mutation.
        addRepo: () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                ...repository,
                full_name: 'test',
                name: 'test',
              });
            }, 2),
          ),
      },
      organizations: [orgMock],
      user: {
        ...userMock,
        login: 'tester',
      },
    });

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    const appNameInput = screen.getByLabelText(textMock('general.service_name'));
    await user.type(appNameInput, 'appname');
    await user.click(createBtn);

    expect(await screen.findByText(textMock('dashboard.creating_your_service')));
  });

  it('should not display loading if process form fails, should display create and cancel button', async () => {
    const user = userEvent.setup();
    const axiosError = createApiErrorMock(ServerCodes.Conflict);
    const addRepoMock = jest.fn().mockImplementation(() => Promise.reject(axiosError));

    renderWithMockServices({ services: { addRepo: addRepoMock }, organizations: [orgMock] });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUserLogin });
    await user.click(orgOption);

    await user.type(
      screen.getByLabelText(textMock('general.service_name')),
      'this-app-name-exists',
    );
    // Adding a tab so that we are sure that the combobox is closed
    await user.tab();

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    user.click(createBtn);

    expect(addRepoMock).rejects.toEqual(axiosError);

    expect(screen.queryByText(textMock('dashboard.creating_your_service'))).not.toBeInTheDocument();
    expect(createBtn).toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('general.cancel') }));
  });

  it('should navigate to app-development if creating the app was successful', async () => {
    const user = userEvent.setup();

    renderWithMockServices({
      services: {
        addRepo: () => Promise.resolve(repository),
      },
      organizations: [orgMock],
      user: {
        ...userMock,
        login: 'tester',
      },
    });

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    const appNameInput = screen.getByLabelText(textMock('general.service_name'));
    await user.type(appNameInput, 'appname');
    await user.click(createBtn);

    expect(windowLocationAssignMock).toHaveBeenCalled();
  });

  it('should set cancel link to /self when selected context is self', async () => {
    const selectedContext = SelectedContextType.Self;
    const subroute = Subroute.AppDashboard;
    (useParams as jest.Mock).mockReturnValue({ selectedContext, subroute });

    renderWithMockServices();
    const cancelLink: HTMLElement = screen.getByRole('link', {
      name: textMock('general.cancel'),
    });

    expect(cancelLink.getAttribute('href')).toBe(`/${subroute}/${selectedContext}`);
  });

  it('should set cancel link to /all when selected context is all', async () => {
    const selectedContext = SelectedContextType.All;
    const subroute = Subroute.AppDashboard;
    (useParams as jest.Mock).mockReturnValue({ selectedContext, subroute });

    renderWithMockServices();
    const cancelLink: HTMLElement = screen.getByRole('link', {
      name: textMock('general.cancel'),
    });

    expect(cancelLink.getAttribute('href')).toBe(`/${subroute}/${selectedContext}`);
  });

  it('should set cancel link to /org when selected context is org', async () => {
    const selectedContext = 'ttd';
    const subroute = Subroute.AppDashboard;
    (useParams as jest.Mock).mockReturnValue({ selectedContext, subroute });

    renderWithMockServices();
    const cancelLink: HTMLElement = screen.getByRole('link', {
      name: textMock('general.cancel'),
    });

    expect(cancelLink.getAttribute('href')).toBe(`/${subroute}/${selectedContext}`);
  });
});

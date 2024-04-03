import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { CreateService } from './CreateService';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { repository, user as userMock } from 'app-shared/mocks/mocks';

const orgMock: Organization = {
  avatar_url: '',
  id: 1,
  username: 'unit-test',
  full_name: 'unit-test',
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const renderWithMockServices = (
  services?: Partial<ServicesContextProps>,
  organizations?: Organization[],
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
            userType: 0,
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

  it('should show error messages when clicking create and no owner or name is filled in', async () => {
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

  it('should prefill owner when there are no available orgs, and the only available user is the logged in user', async () => {
    renderWithMockServices();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('should show error message that app name is too long when it exceeds max length', async () => {
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

  it('should show error message that app name is invalid when it contains invalid characters', async () => {
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

  it('should show error message that app name is invalid when name is to short, then remove the error when name is valid again', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const repoNameInput = screen.getByLabelText(textMock('general.service_name'));

    await act(() => user.type(repoNameInput, 'aa'));

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    const errorMessage = screen.getByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessage).toBeInTheDocument();

    await act(() => user.type(repoNameInput, 'a'));

    const errorMessageAfter = screen.queryByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessageAfter).not.toBeInTheDocument();
  });

  it('should show error message that app already exists when trying to create an app with a name that already exists', async () => {
    const user = userEvent.setup();
    const addRepoMock = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: { status: 409 } }));

    renderWithMockServices({ addRepo: addRepoMock }, [orgMock]);

    await act(() =>
      user.selectOptions(screen.getByLabelText(textMock('general.service_owner')), 'unit-test'),
    );

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'this-app-name-exists'),
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    expect(addRepoMock).rejects.toEqual({ response: { status: 409 } });

    await screen.findByText(textMock('dashboard.app_already_exists'));
  });

  it('should show generic error message when trying to create an app and something unknown went wrong', async () => {
    const user = userEvent.setup();
    const addRepoMock = jest.fn(() => Promise.reject({ response: { status: 500 } }));
    renderWithMockServices({ addRepo: addRepoMock }, [orgMock]);

    await act(() =>
      user.selectOptions(screen.getByLabelText(textMock('general.service_owner')), 'unit-test'),
    );
    await act(() => user.type(screen.getByLabelText(textMock('general.service_name')), 'new-app'));

    const createButton = await screen.findByText(textMock('dashboard.create_service_btn'));
    await act(() => user.click(createButton));

    await expect(addRepoMock).rejects.toEqual({ response: { status: 500 } });

    const emptyFieldErrors = await screen.findAllByText(textMock('general.error_message'));
    expect(emptyFieldErrors.length).toBe(1);
  });

  it('should display loading while the form is processing', async () => {
    const user = userEvent.setup();

    renderWithMockServices(
      {
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
      [orgMock],
      {
        ...userMock,
        login: 'tester',
      },
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    const appNameInput = screen.getByLabelText(textMock('general.service_name'));
    await act(() => user.type(appNameInput, 'appname'));
    await act(() => user.click(createBtn));

    expect(await screen.findByText(textMock('dashboard.creating_your_service')));
  });

  it('should not display loading if process form fails, should display create and cancel button', async () => {
    const user = userEvent.setup();
    const addRepoMock = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: { status: 409 } }));

    renderWithMockServices({ addRepo: addRepoMock }, [orgMock]);

    await act(() =>
      user.selectOptions(screen.getByLabelText(textMock('general.service_owner')), 'unit-test'),
    );

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'this-app-name-exists'),
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createBtn));

    expect(addRepoMock).rejects.toEqual({ response: { status: 409 } });

    expect(screen.queryByText(textMock('dashboard.creating_your_service'))).not.toBeInTheDocument();
    expect(createBtn).toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('general.cancel') }));
  });

  it('should navigate to app-development if creating the app was successful', async () => {
    const user = userEvent.setup();

    renderWithMockServices(
      {
        addRepo: () => Promise.resolve(repository),
      },
      [orgMock],
      {
        ...userMock,
        login: 'tester',
      },
    );

    const createBtn: HTMLElement = screen.getByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });

    const appNameInput = screen.getByLabelText(textMock('general.service_name'));
    await act(() => user.type(appNameInput, 'appname'));
    await act(() => user.click(createBtn));

    expect(windowLocationAssignMock).toHaveBeenCalled();
  });
});

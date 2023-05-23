import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { CreateService } from './CreateService';
import { User } from 'app-shared/types/User';
import { IGiteaOrganisation } from 'app-shared/types/global';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const renderWithMockServices = (
  services?: Partial<ServicesContextProps>,
  organizations?: IGiteaOrganisation[],
  user?: User
) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <CreateService
        organizations={organizations || []}
        user={
          user ||
          ({
            id: 1,
            avatar_url: '',
            email: '',
            full_name: '',
            login: '',
          })
        }
      />
    </MockServicesContextWrapper>
  );
};

describe('CreateService', () => {

  test('should show error messages when clicking create and no owner or name is filled in', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const createBtn = await screen.findByText(textMock('dashboard.create_service_btn'));
    await act(() => user.click(createBtn));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.field_cannot_be_empty')
    );
    expect(emptyFieldErrors.length).toBe(2);
  });

  test('should prefill owner when there are no available orgs, and the only available user is the logged in user', async () => {
    renderWithMockServices();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  test('should show error message that app name is too long when it exceeds max length', async () => {
    const user = userEvent.setup();
    renderWithMockServices();
    await act(() =>
      user.type(screen.getByLabelText(/general.service_name/), 'this-app-name-is-longer-than-max')
    );

    const createBtn = await screen.findByText(textMock('dashboard.create_service_btn'));
    await act(() => user.click(createBtn));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_is_too_long')
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show error message that app name is invalid when it contains invalid characters', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'datamodels')
    );

    const createButton = screen.queryByRole('button', {
      name: textMock('dashboard.create_service_btn'),
    });
    await act(() => user.click(createButton));

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.service_name_has_illegal_characters')
    );
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show error message that app already exists when trying to create an app with a name that already exists', async () => {
    const user = userEvent.setup();
    const org: IGiteaOrganisation = {
      avatar_url: '',
      id: 1,
      username: 'unit-test',
      full_name: 'unit-test',
    };

    const addRepoMock = jest.fn().mockImplementation(() => Promise.reject({ response: { status: 409 } }));

    renderWithMockServices({ addRepo: addRepoMock }, [org]);

    await act(() =>
      user.click(screen.getByRole('combobox', { name: textMock('general.service_owner') }))
    );
    await act(() => user.click(screen.getByRole('option', { name: 'unit-test' })));

    await act(() =>
      user.type(screen.getByLabelText(textMock('general.service_name')), 'this-app-name-exists')
    );

    const createButton = await screen.findByText(textMock('dashboard.create_service_btn'));
    await act(() => user.click(createButton));

    expect(addRepoMock).rejects.toEqual({ response: { status: 409 } });

    const emptyFieldErrors = await screen.findAllByText(textMock('dashboard.app_already_exist'));
    expect(emptyFieldErrors.length).toBe(1);
  });

  test('should show generic error message that app already exists when trying to create an app and something unknown went wrong', async () => {
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

    const emptyFieldErrors = await screen.findAllByText(
      textMock('dashboard.error_when_creating_app')
    );
    expect(emptyFieldErrors.length).toBe(1);
  });
});

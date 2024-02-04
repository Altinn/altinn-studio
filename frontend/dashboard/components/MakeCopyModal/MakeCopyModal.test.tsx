import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MakeCopyModal } from './MakeCopyModal';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const user = userEvent.setup();
const org = 'org';
const app = 'app';
const originalWindowLocation = window.location;
// eslint-disable-next-line
const anchor = document.querySelector('body');

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <MakeCopyModal anchorEl={anchor} handleClose={() => {}} serviceFullName={`${org}/${app}`} />
    </MockServicesContextWrapper>,
  );
};

describe('MakeCopyModal', () => {
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      assign: jest.fn(),
    };
  });

  test('should not show error message when clicking confirm and name is added', async () => {
    renderWithMockServices();

    await act(() => user.type(screen.getByRole('textbox'), 'new-repo-name'));
    await act(() =>
      user.click(
        screen.getByRole('button', {
          name: textMock('dashboard.make_copy'),
        }),
      ),
    );

    expect(screen.queryByText(textMock('dashboard.field_cannot_be_empty'))).not.toBeInTheDocument();
    expect(queriesMock.copyApp).toHaveBeenCalledTimes(1);
    expect(queriesMock.copyApp).toHaveBeenCalledWith('org', 'app', 'new-repo-name');
  });

  test('should show error message when clicking confirm without adding name', async () => {
    renderWithMockServices();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    await act(() => user.click(confirmButton));
    const errorMessageElement = screen.getAllByText(textMock('dashboard.field_cannot_be_empty'));
    expect(errorMessageElement.length).toBeGreaterThan(0);
  });

  test('should show error message when clicking confirm and name is too long', async () => {
    renderWithMockServices();
    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox');
    await act(() => user.type(inputField, 'this-new-name-is-way-too-long-to-be-valid'));
    await act(() => user.click(confirmButton));
    const errorMessageElements = screen.getAllByText(
      textMock('dashboard.service_name_is_too_long'),
    );
    expect(errorMessageElements.length).toBeGreaterThan(0);
  });

  test('should show error message when clicking confirm and name contains invalid characters', async () => {
    renderWithMockServices();
    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox');
    await act(() => user.type(inputField, 'this name is invalid'));
    await act(() => user.click(confirmButton));
    const errorMessageElements = screen.getAllByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessageElements.length).toBeGreaterThan(0);
  });
});

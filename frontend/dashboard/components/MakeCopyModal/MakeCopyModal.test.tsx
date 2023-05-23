import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MakeCopyModal } from './MakeCopyModal';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

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
    </MockServicesContextWrapper>
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
    const copyAppMock = jest.fn(() => Promise.resolve());
    renderWithMockServices({ copyApp: copyAppMock });

    await act(() => user.type(screen.getByRole('textbox'), 'new-repo-name'));
    await act(() => user.click(screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    })));

    expect(screen.queryByText(textMock('dashboard.field_cannot_be_empty'))).not.toBeInTheDocument();
    expect(copyAppMock).toHaveBeenCalledTimes(1);
    expect(copyAppMock).toHaveBeenCalledWith("org", "app", "new-repo-name");
  });

  test('should show error message when clicking confirm without adding name', async () => {
    renderWithMockServices();

    expect(screen.queryByText(textMock('dashboard.field_cannot_be_empty'))).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    await act(() => user.click(confirmButton));
    expect(screen.getByText(textMock('dashboard.field_cannot_be_empty'))).toBeInTheDocument();
  });

  test('should show error message when clicking confirm and name is too long', async () => {
    renderWithMockServices();

    expect(screen.queryByText(textMock('dashboard.service_name_is_too_long'))).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox');
    await act(() => user.type(inputField, 'this-new-name-is-way-too-long-to-be-valid'));
    await act(() => user.click(confirmButton));
    expect(screen.getByText(textMock('dashboard.service_name_is_too_long'))).toBeInTheDocument();
  });

  test('should show error message when clicking confirm and name contains invalid characters', async () => {
    renderWithMockServices();

    expect(
      screen.queryByText(/dashboard\.service_name_has_illegal_characters/i)
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox');
    await act(() => user.type(inputField, 'this name is invalid'));
    await act(() => user.click(confirmButton));
    expect(screen.getByText(textMock('dashboard.service_name_has_illegal_characters'))).toBeInTheDocument();
  });
});

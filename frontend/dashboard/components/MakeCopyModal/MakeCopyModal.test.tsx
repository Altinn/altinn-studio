import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MakeCopyModal } from './MakeCopyModal';
import { mockUseTranslation } from '../../../testing/mocks/i18nMock';
import { MockServicesContextWrapper, Services } from 'dashboard/dashboardTestUtils';

const user = userEvent.setup();
const org = 'org';
const app = 'app';
const originalWindowLocation = window.location;
// eslint-disable-next-line
const anchor = document.querySelector('body');

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (services?: RenderWithMockServicesProps) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <MakeCopyModal anchorEl={anchor} handleClose={() => {}} serviceFullName={`${org}/${app}`} />
    </MockServicesContextWrapper>
  );
};

jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation() }));

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
    renderWithMockServices({
      repoService: {
        copyApp: copyAppMock,
      },
    });

    await user.type(screen.getByRole('textbox'), 'new-repo-name');
    await user.click(screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    }));

    expect(screen.queryByText(/dashboard\.field_cannot_be_empty/i)).not.toBeInTheDocument();
    expect(copyAppMock).toHaveBeenCalledTimes(1);
    expect(copyAppMock).toHaveBeenCalledWith("org", "app", "new-repo-name");
  });

  test('should show error message when clicking confirm without adding name', async () => {
    renderWithMockServices();

    expect(screen.queryByText(/dashboard\.field_cannot_be_empty/i)).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    await user.click(confirmButton);
    expect(screen.getByText(/dashboard\.field_cannot_be_empty/i)).toBeInTheDocument();
  });

  test('should show error message when clicking confirm and name is too long', async () => {
    renderWithMockServices();

    expect(screen.queryByText(/dashboard\.service_name_is_too_long/i)).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    const inputField = screen.getByRole('textbox');
    await user.type(inputField, 'this-new-name-is-way-too-long-to-be-valid');
    await user.click(confirmButton);
    expect(screen.getByText(/dashboard\.service_name_is_too_long/i)).toBeInTheDocument();
  });

  test('should show error message when clicking confirm and name contains invalid characters', async () => {
    renderWithMockServices();

    expect(
      screen.queryByText(/dashboard\.service_name_has_illegal_characters/i)
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    const inputField = screen.getByRole('textbox');
    await user.type(inputField, 'this name is invalid');
    await user.click(confirmButton);
    expect(screen.getByText(/dashboard\.service_name_has_illegal_characters/i)).toBeInTheDocument();
  });
});

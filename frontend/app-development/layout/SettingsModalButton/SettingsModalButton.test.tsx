import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SettingsModalButtonProps } from './SettingsModalButton';
import { SettingsModalButton } from './SettingsModalButton';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const defaultProps: SettingsModalButtonProps = {
  org: mockOrg,
  app: mockApp,
};

describe('SettingsModal', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  it('has SettingsModal default to closed', async () => {
    render();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });

    expect(modalHeading).not.toBeInTheDocument();
  });

  it('opens the SettingsModal when the button is clicked', async () => {
    render();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeading).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: textMock('settings_modal.heading') });
    await act(() => user.click(button));

    const modalHeadingAfter = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeadingAfter).toBeInTheDocument();
  });

  it('closes the SettingsModal when the modal is closed', async () => {
    render();
    const button = screen.getByRole('button', { name: textMock('settings_modal.heading') });
    await act(() => user.click(button));

    const modalHeading = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeading).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    const modalHeadingAfter = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeadingAfter).not.toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <SettingsModalButton {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

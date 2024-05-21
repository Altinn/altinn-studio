import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
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
import { AppDevelopmentContextProvider } from '../../contexts/AppDevelopmentContext';

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
    renderSettingsModalButton();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });

    expect(modalHeading).not.toBeInTheDocument();
  });

  it('opens the SettingsModal when the button is clicked', async () => {
    renderSettingsModalButton();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeading).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(button);

    const modalHeadingAfter = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeadingAfter).toBeInTheDocument();
  });

  it('closes the SettingsModal when the modal is closed', async () => {
    renderSettingsModalButton();
    const button = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(button);

    const modalHeading = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeading).toBeInTheDocument();

    const closeButton = screen.getByRole('button', {
      name: textMock('settings_modal.close_button_label'),
    });
    await user.click(closeButton);

    const modalHeadingAfter = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 1,
    });
    expect(modalHeadingAfter).not.toBeInTheDocument();
  });
});

const renderSettingsModalButton = (
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
        <AppDevelopmentContextProvider>
          <SettingsModalButton {...defaultProps} />
        </AppDevelopmentContextProvider>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

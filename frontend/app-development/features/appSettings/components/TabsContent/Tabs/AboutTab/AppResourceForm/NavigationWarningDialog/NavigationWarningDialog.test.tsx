import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationWarningDialog } from './NavigationWarningDialog';
import { renderWithProviders } from 'app-development/test/mocks';
import { useBlocker } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useBlocker: jest.fn(),
}));

describe('NavigationWarningDialog', () => {
  afterEach(jest.clearAllMocks);

  it('should render dialog with correct title and message', () => {
    (useBlocker as jest.Mock).mockReturnValue({ state: 'blocked' });
    renderNavigationWarningDialog();

    expect(
      screen.getByRole('heading', {
        name: textMock('app_settings.navigation_warning_dialog_header'),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(textMock('app_settings.navigation_warning_dialog_text')),
    ).toBeInTheDocument();
  });

  it('should call reset when clicking "Go back" button', async () => {
    const reset = jest.fn();
    (useBlocker as jest.Mock).mockReturnValue({
      state: 'blocked',
      reset,
    });
    const user = userEvent.setup();
    renderNavigationWarningDialog();

    const goBackButton = screen.getByRole('button', {
      name: textMock('app_settings.navigation_warning_dialog_go_back_button'),
    });
    await user.click(goBackButton);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('should call proceed when clicking "Delete changes" button', async () => {
    const proceed = jest.fn();
    (useBlocker as jest.Mock).mockReturnValue({
      state: 'blocked',
      proceed,
    });
    const user = userEvent.setup();
    renderNavigationWarningDialog();

    const deleteChangesButton = screen.getByRole('button', {
      name: textMock('app_settings.navigation_warning_dialog_delete_changes_button'),
    });
    await user.click(deleteChangesButton);

    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('should not show the dialog when hasContentChanged is false', () => {
    (useBlocker as jest.Mock).mockReturnValue({ state: 'unblocked' });

    renderNavigationWarningDialog(false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const renderNavigationWarningDialog = (hasContentChanged = true) => {
  renderWithProviders()(<NavigationWarningDialog hasContentChanged={hasContentChanged} />);
};

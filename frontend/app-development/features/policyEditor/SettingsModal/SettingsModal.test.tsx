import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';

describe('SettingsModal', () => {
  afterEach(jest.clearAllMocks);

  it('opens the modal when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal />);

    const openButton = screen.getByRole('button', { name: textMock('settings_modal.open_button') });
    await act(() => user.click(openButton));

    expect(screen.getByText(textMock('settings_modal.heading'))).toBeInTheDocument();
  });

  it('closes the modal when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal />);

    const openButton = screen.getByRole('button', { name: textMock('settings_modal.open_button') });
    await act(() => user.click(openButton));

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(screen.queryByText(textMock('settings_modal.heading'))).not.toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewLimitationsInfo } from './PreviewLimitationsInfo';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PreviewLimitationsInfo', () => {
  it('should close popover and not set value in session storage when hidePreviewLimitationsTemporaryButton is clicked', async () => {
    render(<PreviewLimitationsInfo />);

    const user = userEvent.setup();

    // Open popover
    const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
    const alert = within(previewLimitationsAlert);
    const hidePreviewLimitationsAlertButton = alert.getByRole('button', {
      name: textMock('general.close'),
    });
    await user.click(hidePreviewLimitationsAlertButton);
    const hidePreviewLimitationsPopover = screen.getByText(textMock('session.reminder'));
    expect(hidePreviewLimitationsPopover).toBeInTheDocument();
    const hidePreviewLimitationsTemporaryButton = screen.getByRole('button', {
      name: textMock('session.do_show_again'),
    });

    // Click hide temporary button
    await user.click(hidePreviewLimitationsTemporaryButton);

    expect(hidePreviewLimitationsPopover).not.toBeInTheDocument();
    expect(window.localStorage.getItem('showPreviewLimitationsInfo')).toBeNull();
  });

  it('should close popover and set value in session storage when hidePreviewLimitationsForSessionButton is clicked', async () => {
    render(<PreviewLimitationsInfo />);

    const user = userEvent.setup();

    // Open popover
    const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
    const alert = within(previewLimitationsAlert);
    const hidePreviewLimitationsAlertButton = alert.getByRole('button', {
      name: textMock('general.close'),
    });
    await user.click(hidePreviewLimitationsAlertButton);
    const hidePreviewLimitationsPopover = screen.getByText(textMock('session.reminder'));
    expect(hidePreviewLimitationsPopover).toBeInTheDocument();
    const hidePreviewLimitationsForSessionButton = screen.getByRole('button', {
      name: textMock('session.dont_show_again'),
    });

    // Click hide forever button
    await user.click(hidePreviewLimitationsForSessionButton);

    expect(hidePreviewLimitationsPopover).not.toBeInTheDocument();
    expect(window.localStorage.getItem('showPreviewLimitationsInfo')).toBe('false');
  });
});

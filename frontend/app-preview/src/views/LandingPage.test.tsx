import React from 'react';
import { act, screen, queryByAttribute, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingPage } from './LandingPage';
import { renderWithMockStore } from '../../../../frontend/packages/ux-editor/src/testing/mocks';
import { textMock } from '../../../testing/mocks/i18nMock';

describe('LandingPage', () => {

    it('should render an iframe', () => {
        const { renderResult } = renderWithMockStore()(<LandingPage variant={'preview'} />);

        const getById = queryByAttribute.bind(null, 'id');

        const iframe = getById(renderResult.container, 'app-frontend-react-iframe');
        expect(iframe).toBeInTheDocument();
    });

    it('should render the information alert with preview being limited', () => {
        renderWithMockStore()(<LandingPage variant={'preview'} />);

        const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
        expect(previewLimitationsAlert).toBeInTheDocument();
    });

    it('should render a popover with options for remembering closing-choice in session or not when clicking cross-button in alert', async () => {
        renderWithMockStore()(<LandingPage variant={'preview'} />);

        const user = userEvent.setup();

        const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
        const alert = within(previewLimitationsAlert);
        const hidePreviewLimitationsAlertButton = alert.getByRole('button');
        await act(() => user.click(hidePreviewLimitationsAlertButton));
        const hidePreviewLimitationsPopover = screen.getByText(textMock('session.reminder'));
        expect(hidePreviewLimitationsPopover).toBeInTheDocument();
        const hidePreviewLimitationsTemporaryButton = screen.getByRole('button', { name: textMock('session.do_show_again') });
        const hidePreviewLimitationsForSessionButton = screen.getByRole('button', { name: textMock('session.dont_show_again') });
        expect(hidePreviewLimitationsTemporaryButton).toBeInTheDocument();
        expect(hidePreviewLimitationsForSessionButton).toBeInTheDocument();
    });

    it('should close popover and not set value in session storage when hidePreviewLimitationsTemporaryButton is clicked', async () => {
        renderWithMockStore()(<LandingPage variant={'preview'} />);

        const user = userEvent.setup();

        // Open popover
        const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
        const alert = within(previewLimitationsAlert);
        const hidePreviewLimitationsAlertButton = alert.getByRole('button');
        await act(() => user.click(hidePreviewLimitationsAlertButton));
        const hidePreviewLimitationsPopover = screen.getByText(textMock('session.reminder'));
        expect(hidePreviewLimitationsPopover).toBeInTheDocument();
        const hidePreviewLimitationsTemporaryButton = screen.getByRole('button', { name: textMock('session.do_show_again') });

        // Click hide temporary button
        await act(() => user.click(hidePreviewLimitationsTemporaryButton));

        expect(hidePreviewLimitationsPopover).not.toBeInTheDocument();
        expect(window.sessionStorage.getItem('showPreviewLimitationsInfo')).toBeNull();
    });

    it('should close popover and set value in session storage when hidePreviewLimitationsForSessionButton is clicked', async () => {
        renderWithMockStore()(<LandingPage variant={'preview'} />);

        const user = userEvent.setup();

        // Open popover
        const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
        const alert = within(previewLimitationsAlert);
        const hidePreviewLimitationsAlertButton = alert.getByRole('button');
        await act(() => user.click(hidePreviewLimitationsAlertButton));
        const hidePreviewLimitationsPopover = screen.getByText(textMock('session.reminder'));
        expect(hidePreviewLimitationsPopover).toBeInTheDocument();
        const hidePreviewLimitationsForSessionButton = screen.getByRole('button', { name: textMock('session.dont_show_again') });

        // Click hide forever button
        await act(() => user.click(hidePreviewLimitationsForSessionButton));

        expect(hidePreviewLimitationsPopover).not.toBeInTheDocument();
        expect(window.sessionStorage.getItem('showPreviewLimitationsInfo')).toBe('false');
    });
});

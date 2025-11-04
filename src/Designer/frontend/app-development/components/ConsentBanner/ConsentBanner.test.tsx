import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentBanner } from './ConsentBanner';
import * as consentHooks from '../../utils/consent';

jest.mock('../../utils/consent', () => ({
  useConsent: jest.fn(),
  useConsentMutation: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ConsentBanner', () => {
  const mockSetConsentPreferences = jest.fn();
  const mockDenyAllConsent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (consentHooks.useConsentMutation as jest.Mock).mockReturnValue({
      setConsentPreferences: mockSetConsentPreferences,
      denyAllConsent: mockDenyAllConsent,
    });
  });

  it('should show banner when user has not made a decision', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('consent.banner.title')).toBeInTheDocument();
    expect(screen.getByText('consent.banner.description')).toBeInTheDocument();
  });

  it('should not show banner when user has made a decision', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: true,
    });

    render(<ConsentBanner />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should have analytics switch checked by default', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.analytics.label',
    });
    expect(analyticsSwitch).toBeChecked();
  });

  it('should have session recording switch checked by default', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const recordingSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.sessionRecording.label',
    });
    expect(recordingSwitch).toBeChecked();
  });

  it('should disable session recording switch when analytics is disabled', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.analytics.label',
    });
    const recordingSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.sessionRecording.label',
    });

    await user.click(analyticsSwitch);

    expect(recordingSwitch).toBeDisabled();
  });

  it('should call setConsentPreferences with correct values when save is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const saveButton = screen.getByRole('button', { name: 'consent.banner.save' });
    await user.click(saveButton);

    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('should call denyAllConsent when decline all is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const declineButton = screen.getByRole('button', { name: 'consent.banner.declineAll' });
    await user.click(declineButton);

    expect(mockDenyAllConsent).toHaveBeenCalled();
  });

  it('should hide banner after save is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const saveButton = screen.getByRole('button', { name: 'consent.banner.save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should hide banner after decline all is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const declineButton = screen.getByRole('button', { name: 'consent.banner.declineAll' });
    await user.click(declineButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should disable save button when both switches are off', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.analytics.label',
    });
    const recordingSwitch = screen.getByRole('checkbox', {
      name: 'consent.banner.sessionRecording.label',
    });
    const saveButton = screen.getByRole('button', { name: 'consent.banner.save' });

    await user.click(recordingSwitch);
    await user.click(analyticsSwitch);

    expect(saveButton).toBeDisabled();
  });
});

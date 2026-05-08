import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Privacy } from './Privacy';
import { textMock } from '@studio/testing/mocks/i18nMock';
import * as consentHooks from 'app-shared/utils/consent';
import { toast } from 'react-toastify';

jest.mock('app-shared/utils/consent', () => ({
  useConsent: jest.fn(),
  useConsentMutation: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { success: jest.fn() },
}));

const mockSetConsentPreferences = jest.fn();
const mockDenyAllConsent = jest.fn();

const defaultConsentState = {
  hasAnalyticsConsent: false,
  hasSessionRecordingConsent: false,
};

const renderPrivacy = () => render(<Privacy />);

const getAnalyticsSwitch = () =>
  screen.getByRole('switch', { name: textMock('consent.banner.analytics.label') });

const getSessionRecordingSwitch = () =>
  screen.getByRole('switch', { name: textMock('consent.banner.sessionRecording.label') });

const getSaveButton = () => screen.getByRole('button', { name: textMock('consent.banner.save') });

const getRevokeAllButton = () =>
  screen.getByRole('button', { name: textMock('consent.banner.declineAll') });

describe('Privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (consentHooks.useConsent as jest.Mock).mockReturnValue(defaultConsentState);
    (consentHooks.useConsentMutation as jest.Mock).mockReturnValue({
      setConsentPreferences: mockSetConsentPreferences,
      denyAllConsent: mockDenyAllConsent,
    });
  });

  it('renders the page heading', () => {
    renderPrivacy();
    expect(
      screen.getByRole('heading', { name: textMock('settings.user.privacy.heading') }),
    ).toBeInTheDocument();
  });

  it('reflects current analytics consent state when consent is granted', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: false,
    });
    renderPrivacy();
    expect(getAnalyticsSwitch()).toBeChecked();
  });

  it('reflects current session recording consent state when both consents are granted', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    renderPrivacy();
    expect(getSessionRecordingSwitch()).toBeChecked();
  });

  it('disables session recording switch when analytics is off', () => {
    renderPrivacy();
    expect(getSessionRecordingSwitch()).toBeDisabled();
  });

  it('enables session recording switch when analytics is turned on', async () => {
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getAnalyticsSwitch());
    expect(getSessionRecordingSwitch()).not.toBeDisabled();
  });

  it('unchecks session recording when analytics is turned off', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getAnalyticsSwitch());
    expect(getSessionRecordingSwitch()).not.toBeChecked();
  });

  it('calls setConsentPreferences with current toggle state when save is clicked', async () => {
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getAnalyticsSwitch());
    await user.click(getSaveButton());
    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: false,
    });
  });

  it('shows a success toast after saving', async () => {
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getAnalyticsSwitch());
    await user.click(getSaveButton());
    expect(toast.success).toHaveBeenCalledWith(
      textMock('settings.user.privacy.saved'),
      expect.objectContaining({ toastId: 'privacy-saved' }),
    );
  });

  it('resets both toggles and calls denyAllConsent when revoke all is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getRevokeAllButton());
    expect(mockDenyAllConsent).toHaveBeenCalled();
    expect(getAnalyticsSwitch()).not.toBeChecked();
    expect(getSessionRecordingSwitch()).not.toBeChecked();
  });

  it('shows a success toast after revoking all consent', async () => {
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getRevokeAllButton());
    expect(toast.success).toHaveBeenCalledWith(
      textMock('settings.user.privacy.revoked'),
      expect.objectContaining({ toastId: 'privacy-revoked' }),
    );
  });
});

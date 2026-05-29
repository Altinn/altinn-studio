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

describe('Privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (consentHooks.useConsent as jest.Mock).mockReturnValue(defaultConsentState);
    (consentHooks.useConsentMutation as jest.Mock).mockReturnValue({
      setConsentPreferences: jest.fn(),
      denyAllConsent: jest.fn(),
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

  it('shows a success toast after saving', async () => {
    const user = userEvent.setup();
    renderPrivacy();
    await user.click(getAnalyticsSwitch());
    await user.click(getSaveButton());
    expect(toast.success).toHaveBeenCalledWith(textMock('settings.user.privacy.saved'));
  });

  it('does not show a decline all button', () => {
    renderPrivacy();
    expect(
      screen.queryByRole('button', { name: textMock('consent.banner.declineAll') }),
    ).not.toBeInTheDocument();
  });
});

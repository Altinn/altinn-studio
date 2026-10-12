import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentForm } from './ConsentForm';
import { textMock } from '@studio/testing/mocks/i18nMock';
import * as consentHooks from '../../utils/consent';

vi.mock('../../utils/consent', () => ({
  useConsent: vi.fn(),
  useConsentMutation: vi.fn(),
}));

const mockSetConsentPreferences = vi.fn();
const mockDenyAllConsent = vi.fn();

const defaultConsentState = {
  hasAnalyticsConsent: false,
  hasSessionRecordingConsent: false,
};

const renderConsentForm = (props = {}) => render(<ConsentForm {...props} />);

const getAnalyticsSwitch = () =>
  screen.getByRole('switch', { name: textMock('consent.banner.analytics.label') });

const getSessionRecordingSwitch = () =>
  screen.getByRole('switch', { name: textMock('consent.banner.sessionRecording.label') });

const getSaveButton = () => screen.getByRole('button', { name: textMock('consent.banner.save') });

const getDeclineAllButton = () =>
  screen.getByRole('button', { name: textMock('consent.banner.declineAll') });

describe('ConsentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (consentHooks.useConsent as Mock).mockReturnValue(defaultConsentState);
    (consentHooks.useConsentMutation as Mock).mockReturnValue({
      setConsentPreferences: mockSetConsentPreferences,
      denyAllConsent: mockDenyAllConsent,
    });
  });

  it('reflects initial analytics consent in the analytics switch', () => {
    (consentHooks.useConsent as Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: false,
    });
    renderConsentForm();
    expect(getAnalyticsSwitch()).toBeChecked();
  });

  it('reflects initial session recording consent in the session recording switch', () => {
    (consentHooks.useConsent as Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    renderConsentForm();
    expect(getSessionRecordingSwitch()).toBeChecked();
  });

  it('disables session recording switch when analytics is off', () => {
    renderConsentForm();
    expect(getSessionRecordingSwitch()).toBeDisabled();
  });

  it('enables session recording switch when analytics is turned on', async () => {
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsSwitch());
    expect(getSessionRecordingSwitch()).not.toBeDisabled();
  });

  it('unchecks session recording when analytics is turned off', async () => {
    (consentHooks.useConsent as Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsSwitch());
    expect(getSessionRecordingSwitch()).not.toBeChecked();
  });

  it('calls setConsentPreferences with current toggle states when save is clicked', async () => {
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsSwitch());
    await user.click(getSessionRecordingSwitch());
    await user.click(getSaveButton());
    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('calls onSave callback after saving', async () => {
    const mockOnSave = vi.fn();
    const user = userEvent.setup();
    renderConsentForm({ onSave: mockOnSave });
    await user.click(getAnalyticsSwitch());
    await user.click(getSaveButton());
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('does not render decline all button when onDeclineAll is not provided', () => {
    renderConsentForm();
    expect(
      screen.queryByRole('button', { name: textMock('consent.banner.declineAll') }),
    ).not.toBeInTheDocument();
  });

  it('calls denyAllConsent and resets toggles when decline all is clicked', async () => {
    (consentHooks.useConsent as Mock).mockReturnValue({
      hasAnalyticsConsent: true,
      hasSessionRecordingConsent: true,
    });
    const user = userEvent.setup();
    renderConsentForm({ onDeclineAll: vi.fn() });
    await user.click(getDeclineAllButton());
    expect(mockDenyAllConsent).toHaveBeenCalled();
    expect(getAnalyticsSwitch()).not.toBeChecked();
    expect(getSessionRecordingSwitch()).not.toBeChecked();
  });

  it('calls onDeclineAll callback after declining', async () => {
    const mockOnDeclineAll = vi.fn();
    const user = userEvent.setup();
    renderConsentForm({ onDeclineAll: mockOnDeclineAll });
    await user.click(getDeclineAllButton());
    expect(mockOnDeclineAll).toHaveBeenCalled();
  });

  it('does not disable save button by default', () => {
    renderConsentForm();
    expect(getSaveButton()).not.toBeDisabled();
  });

  it('disables save button when variant is banner and analytics is off', () => {
    renderConsentForm({ variant: 'banner' });
    expect(getSaveButton()).toBeDisabled();
  });

  it('enables save button when variant is banner and analytics is on', async () => {
    const user = userEvent.setup();
    renderConsentForm({ variant: 'banner' });
    await user.click(getAnalyticsSwitch());
    expect(getSaveButton()).not.toBeDisabled();
  });
});

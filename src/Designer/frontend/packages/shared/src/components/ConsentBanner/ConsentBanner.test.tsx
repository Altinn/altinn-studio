import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentBanner } from './ConsentBanner';
import { textMock } from '@studio/testing/mocks/i18nMock';
import * as consentHooks from '../../utils/consent';

jest.mock('../../utils/consent', () => ({
  useConsent: jest.fn(),
  useConsentMutation: jest.fn(),
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
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should not show banner when user has made a decision', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: true,
    });

    render(<ConsentBanner />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should have analytics switch unchecked by default for GDPR compliance', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    expect(analyticsSwitch).not.toBeChecked();
  });

  it('should have session recording switch unchecked by default for GDPR compliance', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const recordingSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.sessionRecording.label'),
    });
    expect(recordingSwitch).not.toBeChecked();
  });

  it('should disable session recording switch when analytics is disabled', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const recordingSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.sessionRecording.label'),
    });

    expect(recordingSwitch).toBeDisabled();
    expect(recordingSwitch).not.toBeChecked();
  });

  it('should enable session recording switch when analytics is enabled', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const recordingSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.sessionRecording.label'),
    });

    await user.click(analyticsSwitch);

    expect(recordingSwitch).not.toBeDisabled();
  });

  it('should call setConsentPreferences with all enabled when user enables both and saves', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const recordingSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.sessionRecording.label'),
    });
    const saveButton = screen.getByRole('button', { name: textMock('consent.banner.save') });

    await user.click(analyticsSwitch);
    await user.click(recordingSwitch);
    await user.click(saveButton);

    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('should call setConsentPreferences with only analytics when user enables analytics but not session recording', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const saveButton = screen.getByRole('button', { name: textMock('consent.banner.save') });

    await user.click(analyticsSwitch);
    await user.click(saveButton);

    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: false,
    });
  });

  it('should call denyAllConsent when decline all is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const declineButton = screen.getByRole('button', {
      name: textMock('consent.banner.declineAll'),
    });
    await user.click(declineButton);

    expect(mockDenyAllConsent).toHaveBeenCalled();
  });

  it('should hide banner after save is clicked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const saveButton = screen.getByRole('button', { name: textMock('consent.banner.save') });

    await user.click(analyticsSwitch);
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

    const declineButton = screen.getByRole('button', {
      name: textMock('consent.banner.declineAll'),
    });
    await user.click(declineButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should have save button disabled by default when no consent is given', () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    render(<ConsentBanner />);

    const saveButton = screen.getByRole('button', { name: textMock('consent.banner.save') });

    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when analytics is enabled', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const saveButton = screen.getByRole('button', { name: textMock('consent.banner.save') });

    await user.click(analyticsSwitch);

    expect(saveButton).not.toBeDisabled();
  });

  it('should uncheck session recording when analytics is unchecked', async () => {
    (consentHooks.useConsent as jest.Mock).mockReturnValue({
      hasDecision: false,
    });

    const user = userEvent.setup();
    render(<ConsentBanner />);

    const analyticsSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.analytics.label'),
    });
    const recordingSwitch = screen.getByRole('switch', {
      name: textMock('consent.banner.sessionRecording.label'),
    });

    await user.click(analyticsSwitch);
    await user.click(recordingSwitch);
    expect(recordingSwitch).toBeChecked();

    await user.click(analyticsSwitch);
    expect(recordingSwitch).not.toBeChecked();
  });
});

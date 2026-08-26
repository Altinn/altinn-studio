import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentForm } from './ConsentForm';
import { textMock } from '@studio/testing/mocks/i18nMock';
import * as consentHooks from '../../utils/consent';

jest.mock('../../utils/consent', () => ({
  useConsent: jest.fn(),
  useConsentMutation: jest.fn(),
}));

const mockSetConsentPreferences = jest.fn();
const mockDenyAllConsent = jest.fn();

const defaultConsentState = {
  hasAnalyticsConsent: false,
  hasSessionRecordingConsent: false,
};

describe('ConsentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsentState(defaultConsentState);
    (consentHooks.useConsentMutation as jest.Mock).mockReturnValue({
      setConsentPreferences: mockSetConsentPreferences,
      denyAllConsent: mockDenyAllConsent,
    });
  });

  it('groups the purposes in a fieldset named by the heading', () => {
    renderConsentForm();
    expect(
      screen.getByRole('group', { name: textMock('consent.banner.title') }),
    ).toBeInTheDocument();
  });

  it('offers the purposes as checkboxes', () => {
    renderConsentForm();
    expect(getAnalyticsCheckbox()).toBeInTheDocument();
    expect(getSessionRecordingCheckbox()).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });

  it('leaves both purposes unchecked when no consent has been given', () => {
    renderConsentForm();
    expect(getAnalyticsCheckbox()).not.toBeChecked();
    expect(getSessionRecordingCheckbox()).not.toBeChecked();
  });

  it('reflects initial analytics consent in the analytics checkbox', () => {
    mockConsentState({ hasAnalyticsConsent: true, hasSessionRecordingConsent: false });
    renderConsentForm();
    expect(getAnalyticsCheckbox()).toBeChecked();
  });

  it('reflects initial session recording consent in the session recording checkbox', () => {
    mockConsentState({ hasAnalyticsConsent: true, hasSessionRecordingConsent: true });
    renderConsentForm();
    expect(getSessionRecordingCheckbox()).toBeChecked();
  });

  it('disables the session recording checkbox when analytics is off', () => {
    renderConsentForm();
    expect(getSessionRecordingCheckbox()).toBeDisabled();
  });

  it('enables the session recording checkbox when analytics is turned on', async () => {
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsCheckbox());
    expect(getSessionRecordingCheckbox()).not.toBeDisabled();
  });

  it('unchecks session recording when analytics is turned off', async () => {
    mockConsentState({ hasAnalyticsConsent: true, hasSessionRecordingConsent: true });
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsCheckbox());
    expect(getSessionRecordingCheckbox()).not.toBeChecked();
  });

  it('calls setConsentPreferences with the current selection when save is clicked', async () => {
    const user = userEvent.setup();
    renderConsentForm();
    await user.click(getAnalyticsCheckbox());
    await user.click(getSessionRecordingCheckbox());
    await user.click(getSaveButton());
    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('records a decline when save is clicked without checking anything', async () => {
    const user = userEvent.setup();
    renderConsentForm();
    expect(getSaveButton()).not.toBeDisabled();
    await user.click(getSaveButton());
    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: false,
      sessionRecording: false,
    });
  });

  it('calls onSave callback after saving', async () => {
    const mockOnSave = jest.fn();
    const user = userEvent.setup();
    renderConsentForm({ onSave: mockOnSave });
    await user.click(getAnalyticsCheckbox());
    await user.click(getSaveButton());
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('does not render decline all button when onDeclineAll is not provided', () => {
    renderConsentForm();
    expect(
      screen.queryByRole('button', { name: textMock('consent.banner.declineAll') }),
    ).not.toBeInTheDocument();
  });

  it('gives the save and decline all actions equal visual weight', () => {
    renderConsentForm({ onDeclineAll: jest.fn() });
    expect(getSaveButton()).toHaveAttribute('data-variant', 'primary');
    expect(getDeclineAllButton()).toHaveAttribute('data-variant', 'primary');
  });

  it('calls denyAllConsent and unchecks the purposes when decline all is clicked', async () => {
    mockConsentState({ hasAnalyticsConsent: true, hasSessionRecordingConsent: true });
    const user = userEvent.setup();
    renderConsentForm({ onDeclineAll: jest.fn() });
    await user.click(getDeclineAllButton());
    expect(mockDenyAllConsent).toHaveBeenCalled();
    expect(getAnalyticsCheckbox()).not.toBeChecked();
    expect(getSessionRecordingCheckbox()).not.toBeChecked();
  });

  it('calls onDeclineAll callback after declining', async () => {
    const mockOnDeclineAll = jest.fn();
    const user = userEvent.setup();
    renderConsentForm({ onDeclineAll: mockOnDeclineAll });
    await user.click(getDeclineAllButton());
    expect(mockOnDeclineAll).toHaveBeenCalled();
  });
});

type ConsentState = {
  hasAnalyticsConsent: boolean;
  hasSessionRecordingConsent: boolean;
};

const mockConsentState = (consentState: ConsentState): void => {
  (consentHooks.useConsent as jest.Mock).mockReturnValue(consentState);
};

const getAnalyticsCheckbox = (): HTMLInputElement =>
  screen.getByRole('checkbox', { name: textMock('consent.banner.analytics.label') });

const getSessionRecordingCheckbox = (): HTMLInputElement =>
  screen.getByRole('checkbox', { name: textMock('consent.banner.sessionRecording.label') });

const getSaveButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('consent.banner.save') });

const getDeclineAllButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('consent.banner.declineAll') });

const renderConsentForm = (props = {}): RenderResult => render(<ConsentForm {...props} />);

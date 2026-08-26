import { render, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentBanner } from './ConsentBanner';
import { textMock } from '@studio/testing/mocks/i18nMock';
import * as consentHooks from '../../utils/consent';

jest.mock('../../utils/consent', () => ({
  useConsent: jest.fn(),
  useConsentMutation: jest.fn(),
}));

const mockSetConsentPreferences = jest.fn();
const mockDenyAllConsent = jest.fn();

const undecidedConsentState = {
  hasDecision: false,
  hasAnalyticsConsent: false,
  hasSessionRecordingConsent: false,
};

describe('ConsentBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsentState(undecidedConsentState);
    (consentHooks.useConsentMutation as jest.Mock).mockReturnValue({
      setConsentPreferences: mockSetConsentPreferences,
      denyAllConsent: mockDenyAllConsent,
    });
  });

  it('renders the banner as a region named by its heading when no decision has been made', () => {
    renderConsentBanner();
    expect(getBanner()).toBeInTheDocument();
  });

  it('renders the banner inline instead of as a dialog', () => {
    renderConsentBanner();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render the banner when the user has made a decision', () => {
    mockConsentState({ ...undecidedConsentState, hasDecision: true });
    renderConsentBanner();
    expect(queryBanner()).not.toBeInTheDocument();
  });

  it('hides the banner after saving', async () => {
    const user = userEvent.setup();
    renderConsentBanner();
    await user.click(getSaveButton());
    await waitFor(() => expect(queryBanner()).not.toBeInTheDocument());
  });

  it('hides the banner after declining all', async () => {
    const user = userEvent.setup();
    renderConsentBanner();
    await user.click(getDeclineAllButton());
    await waitFor(() => expect(queryBanner()).not.toBeInTheDocument());
  });

  it('records a decline when the user saves without checking anything', async () => {
    const user = userEvent.setup();
    renderConsentBanner();
    await user.click(getSaveButton());
    expect(mockSetConsentPreferences).toHaveBeenCalledWith({
      analytics: false,
      sessionRecording: false,
    });
  });

  it('calls denyAllConsent when decline all is clicked', async () => {
    const user = userEvent.setup();
    renderConsentBanner();
    await user.click(getDeclineAllButton());
    expect(mockDenyAllConsent).toHaveBeenCalled();
  });
});

type ConsentState = {
  hasDecision: boolean;
  hasAnalyticsConsent: boolean;
  hasSessionRecordingConsent: boolean;
};

const mockConsentState = (consentState: ConsentState): void => {
  (consentHooks.useConsent as jest.Mock).mockReturnValue(consentState);
};

const getBanner = (): HTMLElement =>
  screen.getByRole('region', { name: textMock('consent.banner.title') });

const queryBanner = (): HTMLElement | null =>
  screen.queryByRole('region', { name: textMock('consent.banner.title') });

const getSaveButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('consent.banner.save') });

const getDeclineAllButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('consent.banner.declineAll') });

const renderConsentBanner = (): RenderResult => render(<ConsentBanner />);

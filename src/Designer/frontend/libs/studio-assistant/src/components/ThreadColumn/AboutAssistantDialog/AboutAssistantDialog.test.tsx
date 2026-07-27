import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutAssistantDialog, hasSeenDialogStorageKey } from './AboutAssistantDialog';
import type { AboutAssistantDialogTexts } from '../../../types/AssistantTexts';

const mockDialogTexts: AboutAssistantDialogTexts = {
  heading: 'Om assistenten',
  intro: 'Assistenten er en KI-agent.',
  howToHeading: 'Hvordan bruke assistenten',
  description: 'Beskrivelse av assistenten.',
  branchInfo: 'Grener info',
  branchDocsLink: 'dokumentasjonen',
  disclaimer: 'Assistenten er under utvikling.',
  privacyHeading: 'Personvern',
  privacyDataHandling: 'Ikke send sensitiv informasjon. Alt lagres i 90 dager.',
};

describe('AboutAssistantDialog', () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('should render the trigger button', () => {
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: mockDialogTexts.heading });

    expect(triggerButton).toBeInTheDocument();
  });

  it('should open the dialog automatically when the user has not seen it before', () => {
    renderAboutAssistantDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not open the dialog automatically when the user has seen it before', () => {
    setHasSeenDialogFlag();
    renderAboutAssistantDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should set the has-seen flag in local storage when closing the dialog', async () => {
    const user = userEvent.setup();
    renderAboutAssistantDialog();

    await user.click(screen.getByRole('button', { name: 'Lukk dialogvindu' }));

    expect(window.localStorage.getItem(hasSeenDialogStorageKey)).toBe('true');
  });

  it('should open the dialog when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    setHasSeenDialogFlag();
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: mockDialogTexts.heading });

    await user.click(triggerButton);
    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
  });

  it('should render the privacy section', () => {
    renderAboutAssistantDialog();

    expect(
      screen.getByRole('heading', { name: mockDialogTexts.privacyHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(mockDialogTexts.privacyDataHandling)).toBeInTheDocument();
  });
});

const setHasSeenDialogFlag = (): void => {
  window.localStorage.setItem(hasSeenDialogStorageKey, 'true');
};

const renderAboutAssistantDialog = (): void => {
  render(<AboutAssistantDialog texts={mockDialogTexts} />);
};

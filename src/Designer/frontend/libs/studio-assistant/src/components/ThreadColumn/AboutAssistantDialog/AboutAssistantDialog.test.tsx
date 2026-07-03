import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutAssistantDialog } from './AboutAssistantDialog';
import type { AboutAssistantDialogTexts } from '../../../types/AssistantTexts';

const triggerText = 'Om assistenten';
const hasSeenDialogStorageKey = 'hasSeenAboutAssistantDialog';

const mockDialogTexts: AboutAssistantDialogTexts = {
  heading: 'Om assistenten',
  description: 'Beskrivelse av assistenten.',
  branchInfo: 'Grener info',
  branchDocsLink: 'dokumentasjonen',
  disclaimer: 'Assistenten er under utvikling.',
  dataStorage: 'Vi lagrer data i 90 dager.',
};

describe('AboutAssistantDialog', () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('should render the trigger button', () => {
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: triggerText });

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

  it('should set the has-seen flag in local storage when the dialog is closed', () => {
    renderAboutAssistantDialog();

    fireEvent(screen.getByRole('dialog'), new Event('close'));

    expect(window.localStorage.getItem(hasSeenDialogStorageKey)).toBe('true');
  });

  it('should open the dialog when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    setHasSeenDialogFlag();
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: triggerText });

    await user.click(triggerButton);
    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
  });
});

const setHasSeenDialogFlag = (): void => {
  window.localStorage.setItem(hasSeenDialogStorageKey, 'true');
};

const renderAboutAssistantDialog = (): void => {
  render(<AboutAssistantDialog triggerText={triggerText} texts={mockDialogTexts} />);
};

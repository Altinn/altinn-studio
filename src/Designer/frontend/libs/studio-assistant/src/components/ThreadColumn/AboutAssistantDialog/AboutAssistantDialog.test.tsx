import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutAssistantDialog } from './AboutAssistantDialog';
import type { AboutAssistantDialogTexts } from '../../../types/AssistantTexts';

const triggerText = 'Om assistenten';

const mockDialogTexts: AboutAssistantDialogTexts = {
  heading: 'Om assistenten',
  description: 'Beskrivelse av assistenten.',
  branchInfo: 'Grener info',
  branchDocsLink: 'dokumentasjonen',
  disclaimer: 'Assistenten er under utvikling.',
};

describe('AboutAssistantDialog', () => {
  it('should render the trigger button', () => {
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: triggerText });

    expect(triggerButton).toBeInTheDocument();
  });

  it('should open the dialog when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderAboutAssistantDialog();
    const triggerButton = screen.getByRole('button', { name: triggerText });

    await user.click(triggerButton);
    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
  });
});

const renderAboutAssistantDialog = (): void => {
  render(<AboutAssistantDialog triggerText={triggerText} texts={mockDialogTexts} />);
};

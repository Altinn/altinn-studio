import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PDFPreviewControls } from './PDFPreviewControls';

beforeAll(() => {
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const renderControls = (props?: Partial<ComponentProps<typeof PDFPreviewControls>>) =>
  render(
    <PDFPreviewControls
      title='Generer PDF'
      errorHeading='Kunne ikke vise PDF-forhåndsvisning'
      loadingLabel='Laster'
      onGenerate={async () => ({ type: 'error', message: 'test' })}
      {...props}
    />,
  );

describe('PDFPreviewControls', () => {
  it('shows the button label', () => {
    renderControls();
    expect(screen.getByRole('button', { name: 'Generer PDF' })).toBeInTheDocument();
  });

  it('calls onGenerate when the button is pressed', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn(async () => ({ type: 'error' as const, message: 'test' }));
    renderControls({ onGenerate });
    await user.click(screen.getByRole('button'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});

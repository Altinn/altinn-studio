import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PDFPreviewButton } from './PDFPreviewButton';

beforeAll(() => {
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const render = (
  props?: Partial<ComponentProps<typeof PDFPreviewButton>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <PDFPreviewButton
      componentId='pdf-1'
      onGenerate={async () => ({ type: 'error', message: 'test' })}
      {...props}
    />,
    options,
  );

describe('PDFPreviewButton', () => {
  it('shows the button label', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Generer PDF' } });
    expect(screen.getByRole('button', { name: 'Generer PDF' })).toBeInTheDocument();
  });

  it('calls onGenerate when the button is pressed', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn(async () => ({ type: 'error' as const, message: 'test' }));
    render({ onGenerate });
    await user.click(screen.getByRole('button'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'pdf-preview-1' });
    expect(document.getElementById('form-content-pdf-preview-1')).toBeInTheDocument();
  });
});

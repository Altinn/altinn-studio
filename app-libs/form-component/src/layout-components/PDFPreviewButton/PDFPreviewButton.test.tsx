import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';

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
  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'pdf-preview-1' });
    expect(document.getElementById('form-content-pdf-preview-1')).toBeInTheDocument();
  });
});

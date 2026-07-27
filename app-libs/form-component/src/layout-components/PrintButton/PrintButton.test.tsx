import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PrintButton } from './PrintButton';

const render = (
  props?: Partial<ComponentProps<typeof PrintButton>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <PrintButton componentId='pb-1' onClick={() => undefined} {...props} />,
    options,
  );

describe('PrintButton', () => {
  it('resolves and displays the title key', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Skriv ut' } });
    expect(screen.getByRole('button', { name: 'Skriv ut' })).toBeInTheDocument();
  });

  it('falls back to general.print_button_text when title is omitted', () => {
    render(undefined, { language: 'nb' });
    expect(screen.getByRole('button', { name: 'Print / Lagre PDF' })).toBeInTheDocument();
  });

  it('calls onClick when the button is pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'print-1' });
    expect(document.getElementById('form-content-print-1')).toBeInTheDocument();
  });
});

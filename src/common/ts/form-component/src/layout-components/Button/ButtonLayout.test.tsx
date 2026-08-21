import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ButtonLayout } from './ButtonLayout';

const render = (
  props?: Partial<ComponentProps<typeof ButtonLayout>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <ButtonLayout componentId='btn-1' title='my.title' onClick={() => undefined} {...props} />,
    options,
  );

describe('ButtonLayout', () => {
  it('shows the button label', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Send inn' } });
    expect(screen.getByRole('button', { name: 'Send inn' })).toBeInTheDocument();
  });

  it('calls onClick when the button is pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'submit-1' });
    expect(document.getElementById('form-content-submit-1')).toBeInTheDocument();
  });

  it('shows a status message when provided', () => {
    render({ statusMessage: 'general.wait_for_attachments' }, { language: 'nb' });
    expect(screen.getByText('Vent litt, vi prosesserer vedlegg')).toBeInTheDocument();
  });
});

import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ActionButton } from './ActionButton';

const render = (
  props?: Partial<ComponentProps<typeof ActionButton>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <ActionButton
      componentId='ab-1'
      title='my.title'
      buttonStyle='primary'
      onClick={() => undefined}
      {...props}
    />,
    options,
  );

describe('ActionButton', () => {
  it('shows the button label', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Bekreft' } });
    expect(screen.getByRole('button', { name: 'Bekreft' })).toBeInTheDocument();
  });

  it('calls onClick when the button is pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render({ onClick }, { overrides: { 'my.title': 'Bekreft' } });
    await user.click(screen.getByRole('button', { name: 'Bekreft' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'action-1' });
    expect(document.getElementById('form-content-action-1')).toBeInTheDocument();
  });
});

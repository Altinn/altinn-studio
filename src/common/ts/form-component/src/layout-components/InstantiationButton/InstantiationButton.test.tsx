import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InstantiationButton } from './InstantiationButton';

const render = (
  props?: Partial<ComponentProps<typeof InstantiationButton>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <InstantiationButton
      componentId='ib-1'
      title='my.title'
      onClick={() => undefined}
      {...props}
    />,
    options,
  );

describe('InstantiationButton', () => {
  it('shows the button label', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Start innsending' } });
    expect(screen.getByRole('button', { name: 'Start innsending' })).toBeInTheDocument();
  });

  it('calls onClick when the button is pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'instantiate-1' });
    expect(document.getElementById('form-content-instantiate-1')).toBeInTheDocument();
  });
});

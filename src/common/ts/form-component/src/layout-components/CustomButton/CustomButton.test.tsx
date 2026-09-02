import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CustomButton } from './CustomButton';

const render = (
  props?: Partial<ComponentProps<typeof CustomButton>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <CustomButton componentId='cb-1' title='custom.button' onClick={() => undefined} {...props} />,
    {
      overrides: { 'custom.button': 'Velg neste steg' },
      ...options,
    },
  );

describe('CustomButton', () => {
  it('shows the button label', () => {
    render();
    expect(screen.getByRole('button', { name: 'Velg neste steg' })).toBeInTheDocument();
  });

  it('calls onClick when the button is pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button when disabled is set', () => {
    render({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'custom-1' });
    expect(document.getElementById('form-content-custom-1')).toBeInTheDocument();
  });
});

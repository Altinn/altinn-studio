import type { ComponentProps } from 'react';

import {
  renderWithTranslations,
  type RenderWithTranslationsOptions,
} from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NavigationButtons } from './NavigationButtons';

const render = (
  props?: Partial<ComponentProps<typeof NavigationButtons>>,
  options?: RenderWithTranslationsOptions,
) =>
  renderWithTranslations(
    <NavigationButtons
      componentId='nav-1'
      showNext
      showPrevious
      onClickNext={() => undefined}
      onClickPrevious={() => undefined}
      {...props}
    />,
    options,
  );

describe('NavigationButtons', () => {
  it('shows next and previous buttons', () => {
    render(undefined, { language: 'nb' });
    expect(screen.getByRole('button', { name: 'Neste' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forrige' })).toBeInTheDocument();
  });

  it('hides previous when showPrevious is false', () => {
    render({ showPrevious: false }, { language: 'nb' });
    expect(screen.getByRole('button', { name: 'Neste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forrige' })).not.toBeInTheDocument();
  });

  it('calls onClickNext when next is pressed', async () => {
    const user = userEvent.setup();
    const onClickNext = vi.fn();
    render({ onClickNext }, { language: 'nb' });
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    expect(onClickNext).toHaveBeenCalledTimes(1);
  });

  it('renders the form-content wrapper for the given componentId', () => {
    render({ componentId: 'nav-buttons-1' });
    expect(document.getElementById('form-content-nav-buttons-1')).toBeInTheDocument();
  });
});

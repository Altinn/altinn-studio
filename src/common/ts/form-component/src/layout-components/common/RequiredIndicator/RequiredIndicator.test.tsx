import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { RequiredIndicator } from './RequiredIndicator';

describe('RequiredIndicator', () => {
  it('renders the required marker with text for screen readers when required', () => {
    renderWithTranslations(<RequiredIndicator required />);

    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Required')).toHaveClass('sr-only');
  });

  it('renders nothing when not required', () => {
    const { container } = renderWithTranslations(<RequiredIndicator required={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

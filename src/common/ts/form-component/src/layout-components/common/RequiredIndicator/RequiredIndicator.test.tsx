import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { RequiredIndicator } from './RequiredIndicator';

describe('RequiredIndicator', () => {
  it('renders the required marker as a tag when required', () => {
    renderWithTranslations(<RequiredIndicator required />);

    const tag = screen.getByText('Required');
    expect(tag).toHaveClass('ds-tag');
    expect(tag).toHaveAttribute('data-color', 'warning');
  });

  it('uses the Norwegian wording recommended by Designsystemet', () => {
    renderWithTranslations(<RequiredIndicator required />, { language: 'nb' });

    expect(screen.getByText('Må fylles ut')).toBeInTheDocument();
  });

  it('renders nothing when not required', () => {
    const { container } = renderWithTranslations(<RequiredIndicator required={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

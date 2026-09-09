import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { RequiredIndicator } from './RequiredIndicator';

describe('RequiredIndicator', () => {
  it('renders the required marker when required', () => {
    renderWithTranslations(<RequiredIndicator required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders nothing when not required', () => {
    const { container } = renderWithTranslations(<RequiredIndicator required={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

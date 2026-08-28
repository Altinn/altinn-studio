import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { RequiredIndicator } from './RequiredIndicator';

describe('RequiredIndicator', () => {
  it('renders the required marker with an accessible name when required', () => {
    renderWithTranslations(<RequiredIndicator required />);

    expect(screen.getByLabelText('Required')).toHaveTextContent('*');
  });

  it('renders nothing when not required', () => {
    const { container } = renderWithTranslations(<RequiredIndicator required={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

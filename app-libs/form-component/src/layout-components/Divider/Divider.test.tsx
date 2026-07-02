import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Divider } from './Divider';

describe('Divider', () => {
  it('renders a divider separator', () => {
    const { container } = renderWithTranslations(<Divider componentId='divider-1' />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<Divider componentId='divider-1' />);
    expect(document.getElementById('form-content-divider-1')).toBeInTheDocument();
  });

  it('renders validation messages when provided', () => {
    renderWithTranslations(
      <Divider componentId='divider-1' validationMessages={<span>Feilmelding</span>} />,
    );
    expect(screen.getByText('Feilmelding')).toBeInTheDocument();
  });

  it('does not render a validation area when validationMessages is undefined', () => {
    renderWithTranslations(<Divider componentId='divider-1' />);
    const formContent = document.getElementById('form-content-divider-1');
    expect(formContent).toBeInTheDocument();
    expect(formContent?.children).toHaveLength(1);
  });
});

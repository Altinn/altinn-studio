import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';

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
});

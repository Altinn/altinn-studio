import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { OptionalIndicator } from './OptionalIndicator';

describe('OptionalIndicator', () => {
  it('renders the optional marking as a tag by default when not required', () => {
    renderWithTranslations(<OptionalIndicator required={false} />);

    const tag = screen.getByText('Optional');
    expect(tag).toHaveClass('ds-tag');
    expect(tag).toHaveAttribute('data-color', 'info');
  });

  it('uses the Norwegian wording recommended by Designsystemet', () => {
    renderWithTranslations(<OptionalIndicator required={false} />, { language: 'nb' });

    expect(screen.getByText('Valgfritt')).toBeInTheDocument();
  });

  it('renders nothing when required', () => {
    const { container } = renderWithTranslations(<OptionalIndicator required />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the component has no notion of being required', () => {
    const { container } = renderWithTranslations(<OptionalIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when read-only', () => {
    const { container } = renderWithTranslations(<OptionalIndicator required={false} readOnly />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when optional marking is disabled', () => {
    const { container } = renderWithTranslations(
      <OptionalIndicator required={false} showOptionalMarking={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

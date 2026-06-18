import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { OptionalIndicator } from './OptionalIndicator';

describe('OptionalIndicator', () => {
  it('renders the optional marking when marking is enabled', () => {
    renderWithTranslations(<OptionalIndicator showOptionalMarking />);

    expect(screen.getByText(/\(Optional\)/)).toBeInTheDocument();
  });

  it('renders nothing when required', () => {
    const { container } = renderWithTranslations(
      <OptionalIndicator required showOptionalMarking />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when read-only', () => {
    const { container } = renderWithTranslations(
      <OptionalIndicator readOnly showOptionalMarking />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when optional marking is disabled', () => {
    const { container } = renderWithTranslations(<OptionalIndicator showOptionalMarking={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

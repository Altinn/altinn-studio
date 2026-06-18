import { getDescriptionId } from '@app/form-component/layout-components/utils/labelIds';
import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Description } from './Description';

describe('Description', () => {
  it('renders the description content', () => {
    renderWithTranslations(<Description description='Some description' />);

    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('uses the description id derived from componentId', () => {
    renderWithTranslations(
      <Description description='Some description' componentId='my-component' />,
    );

    expect(screen.getByTestId(getDescriptionId('my-component')!)).toBeInTheDocument();
  });

  it('renders nothing when description is empty', () => {
    const { container } = renderWithTranslations(<Description description={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

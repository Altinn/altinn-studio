import { render, screen } from '@testing-library/react';

import { ComponentStructure } from './ComponentStructure';

describe('ComponentStructure', () => {
  it('renders the children and the validation messages', () => {
    const { container } = render(
      <ComponentStructure
        componentId='structure-id'
        validationMessages={<span>Something is wrong</span>}
      >
        <span>Content</span>
      </ComponentStructure>,
    );

    expect(container.querySelector('#form-content-structure-id')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Something is wrong')).toBeInTheDocument();
  });
});

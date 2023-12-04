import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCenter } from './StudioCenter';

// Mocks:
jest.mock('./SchemaEditor.module.css', () => ({
  root: 'root',
}));

describe('StudioCenter', () => {
  it('Renders children', () => {
    const testId = 'centered-content';
    render(
      <StudioCenter>
        <div data-testid={testId} />
      </StudioCenter>,
    );
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    const className = 'test-class';
    const { container } = render(<StudioCenter className={className} />);
    expect(container.firstChild).toHaveClass(className); // eslint-disable-line testing-library/no-node-access
    expect(container.firstChild).toHaveClass('root'); // eslint-disable-line testing-library/no-node-access
  });
});

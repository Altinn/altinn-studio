import React from 'react';
import { Center } from 'app-shared/components/Center/Center';
import { render, screen } from '@testing-library/react';

// Mocks:
jest.mock('./SchemaEditor.module.css', () => ({
  root: 'root',
}));

describe('Center', () => {
  it('Renders children', () => {
    const testId = 'centered-content';
    render(<Center><div data-testid={testId} /></Center>);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    const className = 'test-class';
    const { container } = render(<Center className={className} />);
    expect(container.firstChild).toHaveClass(className); // eslint-disable-line testing-library/no-node-access
    expect(container.firstChild).toHaveClass('root'); // eslint-disable-line testing-library/no-node-access
  });
});

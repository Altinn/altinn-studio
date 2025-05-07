import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCenter } from './StudioCenter';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

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
    testRootClassNameAppending((className) => render(<StudioCenter className={className} />));
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioCenter } from './StudioCenter';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

// Mocks:
vi.mock('./StudioCenter.module.css', () => ({
  default: {
    root: 'root',
  },
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

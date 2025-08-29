import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSpinner } from './StudioSpinner';
import type { StudioSpinnerProps } from './StudioSpinner';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const mockTestId: string = 'testId';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useId: (): string => mockTestId,
}));

describe('StudioSpinner', () => {
  it('should render the spinnerText and the spinner should have aria-describeBy set when spinnerText is present', () => {
    const spinnerTitle: string = 'Test text';
    renderStudioSpinner({ spinnerTitle });

    const spinnerText = screen.getByText(spinnerTitle);
    expect(spinnerText).toBeInTheDocument();

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).toHaveAttribute('aria-describedby', mockTestId);
    expect(spinnerText).toHaveAttribute('id', mockTestId);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioSpinner({ className }));
  });
});

const defaultProps: StudioSpinnerProps = {
  'aria-label': 'Loading',
  'data-size': 'md',
  'aria-hidden': true,
};

const renderStudioSpinner = (props: Partial<StudioSpinnerProps>): RenderResult => {
  return render(<StudioSpinner {...defaultProps} {...props} />);
};

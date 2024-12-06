import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageSpinner } from './StudioPageSpinner';

const mockSpinnerText: string = 'Test text';
const mockTestId: string = 'testId';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useId: () => mockTestId,
}));

describe('StudioPageSpinner', () => {
  afterEach(jest.clearAllMocks);

  it('should render default loading message as accessibility title when spinnerText is not provided', () => {
    render(<StudioPageSpinner spinnerTitle={mockSpinnerText} />);

    expect(screen.getByTitle(mockSpinnerText));

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).not.toHaveAttribute('aria-describedby');
  });

  it('should render the spinnerText and the spinner should have aria-describeBy set when spinnerText is present', () => {
    render(<StudioPageSpinner spinnerTitle={mockSpinnerText} showSpinnerTitle />);

    const spinnerText = screen.getByText(mockSpinnerText);
    expect(spinnerText).toBeInTheDocument();

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).toHaveAttribute('aria-describedby', mockTestId);
    expect(spinnerText).toHaveAttribute('id', mockTestId);
  });
});

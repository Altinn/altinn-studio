import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioSpinner, clampSizeWithinLimits } from './StudioSpinner';

const mockSpinnerText: string = 'Test text';
const mockTestId: string = 'testId';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useId: () => mockTestId,
}));

describe('StudioSpinner', () => {
  afterEach(jest.clearAllMocks);

  it('should render default loading message as accessibility title when showSpinnerTitle is false', () => {
    render(<StudioSpinner spinnerTitle={mockSpinnerText} />);

    expect(screen.getByTitle(mockSpinnerText));

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).not.toHaveAttribute('aria-describedby');
  });

  it('should render the spinnerText and the spinner should have aria-describeBy set when spinnerText is present', () => {
    render(<StudioSpinner spinnerTitle={mockSpinnerText} showSpinnerTitle />);

    const spinnerText = screen.getByText(mockSpinnerText);
    expect(spinnerText).toBeInTheDocument();

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).toHaveAttribute('aria-describedby', mockTestId);
    expect(spinnerText).toHaveAttribute('id', mockTestId);
  });

  describe('clampSizeWithinLimits', () => {
    it('returns lower limit size when spinnerSize is below lower limit', () => {
      const paragraphSize = clampSizeWithinLimits('2xs', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('xs');
    });

    it('returns upper limit size when spinnerSize is over upper limit', () => {
      const paragraphSize = clampSizeWithinLimits('xl', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('lg');
    });

    it('returns xs when spinnerSize is xxsmall', () => {
      const paragraphSize = clampSizeWithinLimits('xxsmall', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('xs');
    });

    it('returns actual size when spinnerSize is on the upper limit', () => {
      const paragraphSize = clampSizeWithinLimits('lg', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('lg');
    });

    it('returns actual size when spinnerSize is on the lower limit', () => {
      const paragraphSize = clampSizeWithinLimits('xs', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('xs');
    });

    it('returns actual size when spinnerSize is within limits', () => {
      const paragraphSize = clampSizeWithinLimits('md', {
        upperLimit: 'lg',
        lowerLimit: 'xs',
      });
      expect(paragraphSize).toBe('md');
    });
  });
});

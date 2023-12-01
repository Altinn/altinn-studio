import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioSpinner } from './StudioSpinner';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const mockSpinnerText: string = 'Test text';
const mockTestId: string = 'testId';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useId: () => mockTestId,
}));

describe('StudioSpinner', () => {
  afterEach(jest.clearAllMocks);

  it('should render default loading message as accessibility title when spinnerText is not provided', () => {
    render(<StudioSpinner />);

    expect(screen.getByTitle(textMock('general.loading')));

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).not.toHaveAttribute('aria-describedby');
  });

  it('should render the spinnerText and the spinner should have aria-describeBy set when spinnerText is present', () => {
    render(<StudioSpinner spinnerText={mockSpinnerText} />);

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    expect(spinnerTitle).not.toBeInTheDocument();

    const spinnerText = screen.getByText(mockSpinnerText);
    expect(spinnerText).toBeInTheDocument();

    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).toHaveAttribute('aria-describedby', mockTestId);
    expect(spinnerText).toHaveAttribute('id', mockTestId);
  });
});

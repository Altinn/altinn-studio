import { screen } from '@testing-library/react';
import { ProblemStatusIndicator, type ProblemStatusIndicatorProps } from './ProblemStatusIndicator';
import { renderWithProviders } from '../../../../test/mocks';

describe('ProblemStatusIndicator', () => {
  it('should show loading spinner when validation is pending', () => {
    renderProblemStatusIndicator({ validationPending: true });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show checkmark icon when there are no validation errors', () => {
    renderProblemStatusIndicator({ validationResult: { errors: undefined, isValid: true } });
    expect(screen.getByTestId('checkmark-icon')).toBeInTheDocument();
  });

  it('should show warning icon when there are non-critical validation errors', () => {
    const validationResult = {
      errors: {
        'title.en': ['warning1'],
      },
      isValid: false,
    };
    renderProblemStatusIndicator({ validationResult });
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('should show error icon when there are critical validation errors', () => {
    const validationResult = {
      errors: {
        'title.nb': ['error1'],
      },
      isValid: false,
    };
    renderProblemStatusIndicator({ validationResult });
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('should show error icon when there are unknown validation errors', () => {
    const validationResult = {
      errors: { unknown_error_key: ['error2'] },
      isValid: false,
    };
    renderProblemStatusIndicator({ validationResult });
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });
});

const renderProblemStatusIndicator = (props: Partial<ProblemStatusIndicatorProps> = {}) => {
  const defaultProps: ProblemStatusIndicatorProps = {
    validationResult: undefined,
    refetchValidation: jest.fn(),
    validationPending: false,
  };

  return renderWithProviders()(<ProblemStatusIndicator {...defaultProps} {...props} />);
};

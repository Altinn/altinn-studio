import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IAltinnInputProps } from './AltinnInput';
import AltinnInput from './AltinnInput';

const render = (props: Partial<IAltinnInputProps> = {}) => {
  const allProps = {
    label: 'inputLabel',
    ...props,
  };

  rtlRender(<AltinnInput {...allProps} />);
};

describe('AltinnInput', () => {
  it('should call onChange when typing in the input field', async () => {
    const handleChange = jest.fn();
    render({ onChange: handleChange });

    const input = screen.getByRole('textbox', {
      name: /inputlabel/i,
    });

    await userEvent.type(input, 'input-text');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show label when showLabel is true', () => {
    render({ showLabel: true });

    expect(screen.getByText(/inputlabel/i)).toBeInTheDocument();
  });

  it('should add input-validation-error id when applying inputValidationError class', () => {
    render({ validationError: true });
    expect(screen.getByTestId(/input-validation-error/i)).toBeInTheDocument();
    expect(screen.queryByTestId(/input-validation-error/i)).not.toBeNull();
  });

  it('should not add input-validation-error id when applying inputValidationError class', () => {
    render({ validationError: false });
    expect(screen.queryByTestId(/input-validation-error/i)).toBeNull();
  });

  it('should not show label when showLabel is false', () => {
    render({ showLabel: false });

    expect(screen.queryByText(/inpulabel/i)).not.toBeInTheDocument();
  });

  it('should show icon when iconString is set', () => {
    render({ iconString: 'icon-str' });

    expect(screen.getByTestId('altinninput-iconString')).toBeInTheDocument();
  });

  it('should show icon when iconString is set', () => {
    render();

    expect(
      screen.queryByTestId('altinninput-iconString'),
    ).not.toBeInTheDocument();
  });
});

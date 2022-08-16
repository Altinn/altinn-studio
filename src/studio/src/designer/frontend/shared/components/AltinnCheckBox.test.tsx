import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AltinnCheckBoxComponent from './AltinnCheckBox';
import type { IAltinnCheckBoxComponentProvidedProps } from './AltinnCheckBox';

const user = userEvent.setup();

describe('AltinnCheckBox', () => {
  it('should not be disabled by default', () => {
    render();

    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('should be disabled when disabled is true', () => {
    render({ disabled: true });

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('should call onChangeFunction when clicked', async () => {
    const handleChange = jest.fn();
    render({ onChangeFunction: handleChange });

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });
});

const render = (props: Partial<IAltinnCheckBoxComponentProvidedProps> = {}) => {
  const allProps = {
    checked: false,
    ...props,
  } as IAltinnCheckBoxComponentProvidedProps;

  rtlRender(<AltinnCheckBoxComponent {...allProps} />);
};

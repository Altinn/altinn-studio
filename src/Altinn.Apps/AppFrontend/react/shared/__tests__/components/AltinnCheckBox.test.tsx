import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AltinnCheckBoxComponent from '../../src/components/AltinnCheckBox';

const render = (props = {}) => {
  const allProps = {
    checked: false,
    ...props,
  };

  rtlRender(<AltinnCheckBoxComponent {...allProps} />);
};

describe('AltinnCheckBox', () => {
  it('should call change handler when clicked', () => {
    const handleChange = jest.fn();
    render({ onChangeFunction: handleChange });

    const checkbox = screen.getByRole('checkbox');
    userEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });

  it('should not call change handler when clicked and disabled is true', () => {
    const handleChange = jest.fn();
    render({ onChangeFunction: handleChange, disabled: true });

    const checkbox = screen.getByRole('checkbox');

    expect(() => userEvent.click(checkbox)).toThrow(); // When disabled, pointer-events: none is set, so it will not be clickable, and it should throw
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call change handler when focused with tab and enter is hit', () => {
    const handleChange = jest.fn();
    render({ onKeyPressFunction: handleChange });

    userEvent.tab();
    userEvent.keyboard('{enter}');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should not call change handler when focused with tab and enter is hit, when disabled is true', () => {
    const handleChange = jest.fn();
    render({ onKeyPressFunction: handleChange, disabled: true });

    userEvent.tab();
    userEvent.keyboard('{enter}');

    expect(handleChange).not.toHaveBeenCalled();
  });
});

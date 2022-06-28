import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';

import AltinnCheckBoxComponent from './AltinnCheckBox';

const render = (props = {}) => {
  const allProps = {
    checked: false,
    ...props,
  };

  rtlRender(<AltinnCheckBoxComponent {...allProps} />);
};

describe('AltinnCheckBox', () => {
  it('should call change handler when clicked', async () => {
    const handleChange = jest.fn();
    render({ onChangeFunction: handleChange });

    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });

  it('should not call change handler when clicked and disabled is true', async () => {
    const handleChange = jest.fn();
    render({ onChangeFunction: handleChange, disabled: true });

    const checkbox = screen.getByRole('checkbox');

    await userEvent.click(checkbox, {
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call change handler when focused with tab and enter is hit', async () => {
    const handleChange = jest.fn();
    render({ onKeyPressFunction: handleChange });

    await userEvent.tab();
    await userEvent.keyboard('{enter}');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should not call change handler when focused with tab and enter is hit, when disabled is true', async () => {
    const handleChange = jest.fn();
    render({ onKeyPressFunction: handleChange, disabled: true });

    await userEvent.tab();
    await userEvent.keyboard('{enter}');

    expect(handleChange).not.toHaveBeenCalled();
  });
});

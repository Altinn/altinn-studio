import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AltinnTextArea from '../../src/components/AltinnTextArea';

const render = (props = {}) => {
  const allProps = {
    label: 'inputLabel',
    ...props,
  };

  rtlRender(<AltinnTextArea {...allProps} />);
};

describe('AltinnTextArea', () => {
  it('should call onChange when typing in the textarea', () => {
    const handleChange = jest.fn();
    render({ onChange: handleChange });

    const input = screen.getByRole('textbox');

    userEvent.type(input, 'input-text');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show label when showLabel is true', () => {
    render({ showLabel: true });

    expect(screen.getByText(/inputlabel/i)).toBeInTheDocument();
  });

  it('should not show label when showLabel is false', () => {
    render({ showLabel: false });

    expect(screen.queryByText(/inpulabel/i)).not.toBeInTheDocument();
  });
});

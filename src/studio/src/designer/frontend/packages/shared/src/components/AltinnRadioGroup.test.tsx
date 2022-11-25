import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AltinnRadio } from './AltinnRadio';
import { AltinnRadioGroup } from './AltinnRadioGroup';
import type { IAltinnRadioGroupProps } from './AltinnRadioGroup';

const user = userEvent.setup();

describe('AltinnRadioGroup', () => {
  it('should render description when description is supplied', () => {
    render({ description: 'some-description' });

    expect(screen.getByText('some-description')).toBeInTheDocument();
  });

  it('should fire onChange callback when clicking radio', async () => {
    const handleChange = jest.fn();
    render({ onChange: handleChange });

    const radio = screen.getByRole('radio');
    await user.click(radio);

    expect(handleChange).toHaveBeenCalled();
  });
});

const render = (props: Partial<IAltinnRadioGroupProps> = {}) => {
  const allProps = {
    value: 'mock-value',
    children: <AltinnRadio />,
    ...props,
  };

  rtlRender(<AltinnRadioGroup {...allProps} />);
};

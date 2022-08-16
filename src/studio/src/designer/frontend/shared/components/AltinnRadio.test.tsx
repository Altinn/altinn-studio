import { render as rtlRender, screen } from '@testing-library/react';
import React from 'react';
import { AltinnRadio } from './AltinnRadio';
import type { IAltinnRadioProps } from './AltinnRadio';

describe('AltinnRadioButton', () => {
  it('should render FormControlLabel wrapper when label is supplied', () => {
    render({ label: 'Label value' });

    expect(screen.getByRole('radio')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', {
        name: /label value/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Label value')).toBeInTheDocument();
  });

  it('should not render FormControlLabel wrapper when no label is supplied', () => {
    render();

    expect(screen.getByRole('radio')).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', {
        name: /label value/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Label value')).not.toBeInTheDocument();
  });
});

const render = (props: Partial<IAltinnRadioProps> = {}) => {
  const allProps = {
    ...props,
  } as IAltinnRadioProps;

  rtlRender(<AltinnRadio {...allProps} />);
};

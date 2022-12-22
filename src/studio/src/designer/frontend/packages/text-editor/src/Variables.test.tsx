import React from 'react';
import type { VariablesProps } from './Variables';
import { Variables } from './Variables';
import { screen, render as rtlRender } from '@testing-library/react';

const renderVariables = (props: Partial<VariablesProps> = {}) => {
  const allProps: VariablesProps = {
    variables: [],
    infoboxOpen: false,
    setInfoboxOpen: (open: boolean) => open,
    ...props,
  };
  rtlRender(<Variables {...allProps} />);
};

describe('Variables', () => {
  it('renders nothing useful at the moment', () => {
    renderVariables();
    expect(
      screen.getByTitle('Det er ikke lagt til støtte for redigering av variabler i Studio.')
    ).toBeInTheDocument();
  });
  it('renders a list of the variables you must edit in a text editor', () => {
    renderVariables({
      variables: [
        { key: 'something', dataSource: 'strange' },
        { key: 'in', dataSource: 'the' },
        { key: 'neighbor', dataSource: 'hood' },
      ],
    });
    const a = screen.getByText(/something: strange/i);
    const b = screen.getByText(/in: the/i);
    const c = screen.getByText(/neighbor: hood/i);
    expect(a).toBeInTheDocument();
    expect(b).toBeInTheDocument();
    expect(c).toBeInTheDocument();
  });
});

import React from 'react';
import type { VariablesProps } from './Variables';
import { Variables } from './Variables';
import { screen, render as rtlRender } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';

const renderVariables = (props: Partial<VariablesProps> = {}) => {
  const allProps: VariablesProps = {
    variables: [],
    ...props,
  };
  rtlRender(<Variables {...allProps} />);
};

describe('Variables', () => {
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

    expect(
      screen.getByTitle(textMock('text_editor.variables_editing_not_supported')),
    ).toBeInTheDocument();
  });
  it('renders two span elements and correct default value if it exists', () => {
    const variables = [
      { key: 'some key', dataSource: 'some data source', defaultValue: 'some default value' },
    ];
    renderVariables({
      variables: variables,
    });
    const defaultValue = screen.getByText(textMock('text_editor.variables_default_value'));
    expect(defaultValue).toBeInTheDocument();
  });
});

import * as React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import SummaryBoilerplate from 'src/components/summary/SummaryBoilerplate';
import type { SummaryBoilerplateProps } from 'src/components/summary/SummaryBoilerplate';

describe('SummaryBoilerplate', () => {
  it('should render the boilerplate with the default props', () => {
    render();

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /some text on a button/i,
      }),
    ).toBeInTheDocument();
  });

  it('should not render change-button when readOnlyComponent is true', () => {
    render({ readOnlyComponent: true });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show validation message when hasValidationMessages is true', () => {
    render({ hasValidationMessages: true });

    expect(screen.getByTestId('has-validation-message')).toBeInTheDocument();
  });
});

const render = (props: Partial<SummaryBoilerplateProps> = {}) => {
  const allProps = {
    onChangeClick: jest.fn(),
    changeText: 'some text on a button',
    label: <h3>label text</h3>,
    ...props,
  };

  return rtlRender(<SummaryBoilerplate {...allProps} />);
};

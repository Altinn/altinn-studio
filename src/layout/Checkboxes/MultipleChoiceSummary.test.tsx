import React from 'react';

import { render as rtlRender } from '@testing-library/react';

import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import type { IMultipleChoiceSummaryProps } from 'src/layout/Checkboxes/MultipleChoiceSummary';

describe('MultipleChoiceSummary', () => {
  test('MultipleChoiceSummary', () => {
    const { asFragment } = render();
    expect(asFragment()).toMatchSnapshot();
  });
});

function render(props: Partial<IMultipleChoiceSummaryProps> = {}) {
  const defaultProps: IMultipleChoiceSummaryProps = {
    formData: {
      1: 'This is a text',
      2: 'This is another text',
    },
    label: 'TestLabel',
    hasValidationMessages: false,
    changeText: 'Endre',
    onChangeClick: jest.fn(),
    readOnlyComponent: false,
  };

  return rtlRender(
    <MultipleChoiceSummary
      {...defaultProps}
      {...props}
    />,
  );
}

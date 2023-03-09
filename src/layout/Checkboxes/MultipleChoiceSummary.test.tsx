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
    formData: { 'some-key': 'This is a text', 'some-other-key': 'This is another text' },
  };

  return rtlRender(
    <MultipleChoiceSummary
      {...defaultProps}
      {...props}
    />,
  );
}

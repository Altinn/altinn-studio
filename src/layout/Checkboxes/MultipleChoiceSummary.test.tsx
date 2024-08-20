import React from 'react';

import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IMultipleChoiceSummaryProps } from 'src/layout/Checkboxes/MultipleChoiceSummary';

describe('MultipleChoiceSummary', () => {
  test('MultipleChoiceSummary', async () => {
    const { asFragment } = await render();
    expect(asFragment()).toMatchSnapshot();
  });
});

async function render(props: Partial<IMultipleChoiceSummaryProps> = {}) {
  const defaultProps: IMultipleChoiceSummaryProps = {
    getFormData: () => ({ 'some-key': 'This is a text', 'some-other-key': 'This is another text' }),
  };

  return await renderWithInstanceAndLayout({
    renderer: () => (
      <MultipleChoiceSummary
        {...defaultProps}
        {...props}
      />
    ),
  });
}

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScreenReaderLabel, ScreenReaderLabelProps } from './ScreenReaderLabel';
import { TextField } from '@digdir/design-system-react';

const mockHtmlFor: string = 'test';
const mockLabel: string = 'TestLabel';

describe('ScreenReaderLabel', () => {
  const defaultProps: ScreenReaderLabelProps = {
    htmlFor: mockHtmlFor,
    label: mockLabel,
  };

  it('renders the label with the correct htmlFor attribute', () => {
    render(
      <>
        <ScreenReaderLabel {...defaultProps} />
        <TextField id={mockHtmlFor} />
      </>
    );

    const labelElement = screen.getByLabelText(mockLabel);
    expect(labelElement).toBeInTheDocument();
  });
});

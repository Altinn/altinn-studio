import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioTextfield } from './StudioTextfield';
import type { StudioTextfieldProps } from './StudioTextfield';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const label: string = 'My label';

describe('StudioTextfield', () => {
  it('should render with label wrapped in StudioLabelWrapper by default', () => {
    renderStudioTextfield({ label });
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('should render label with asterisk when withAsterisk is true', () => {
    renderStudioTextfield({ label, withAsterisk: true });

    const labelElement = screen.getByText(label);
    expect(labelElement).toHaveClass('studioLabelWrapper');
    expect(labelElement).toHaveClass('withAsterisk');
  });

  it('should render without custom label wrapper when aria-label is set', () => {
    const ariaLabel: string = 'aria label';
    renderStudioTextfield({ 'aria-label': ariaLabel });
    expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
  });

  it('should render without custom label wrapper when aria-labelledby is set', () => {
    const labelledById: string = 'external-label';
    renderStudioTextfield({
      'aria-labelledby': labelledById,
    });
    const input: HTMLElement = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-labelledby', labelledById);
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    renderStudioTextfield({ label });

    const input: HTMLElement = screen.getByLabelText(label);
    const inputValue: string = 'test';
    await user.type(input, inputValue);
    expect(input).toHaveValue(inputValue);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className: string) => renderStudioTextfield({ label, className }));
  });
});

const renderStudioTextfield = (props: StudioTextfieldProps): RenderResult => {
  return render(<StudioTextfield {...props} />);
};

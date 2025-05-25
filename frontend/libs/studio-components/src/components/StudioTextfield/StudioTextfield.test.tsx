import React from 'react';
import { screen, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioTextfield } from './StudioTextfield';
import type { StudioTextfieldProps } from './StudioTextfield';
import userEvent from '@testing-library/user-event';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const label: string = 'My label';

describe('StudioTextfield', () => {
  it('should render a textfield with label and no required text by default', () => {
    renderStudioTextfield({ label });
    expect(screen.getByLabelText(label)).toBeInTheDocument();
    const labelElement = screen.getByText(label);
    expect(labelElement).not.toHaveClass('requiredTag');
  });

  it('should render a textfield with required text when required is true and required is true', () => {
    const tagText: string = 'Required';
    renderStudioTextfield({
      label,
      required: true,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });

  it('should render a textfield with required text when required is false and required is true', () => {
    const tagText: string = 'Optional';
    renderStudioTextfield({
      label,
      required: false,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });

  it('should render a textfield using aria-label if provided', () => {
    const ariaLabel: string = 'aria label';
    renderStudioTextfield({ 'aria-label': ariaLabel });
    expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
  });

  it('should render a textfield using aria-labelledby if provided', () => {
    const labelledById: string = 'external-label';
    renderStudioTextfield({
      'aria-labelledby': labelledById,
    });
    const input: HTMLInputElement = screen.getByRole('textbox');
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

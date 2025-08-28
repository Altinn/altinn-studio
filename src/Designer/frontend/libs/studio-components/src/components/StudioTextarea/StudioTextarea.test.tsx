import React from 'react';
import { screen, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioTextarea } from './StudioTextarea';
import type { StudioTextareaProps } from './StudioTextarea';
import userEvent from '@testing-library/user-event';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const label: string = 'My label';

describe('StudioTextarea', () => {
  it('should render a textarea with label and no required text by default', () => {
    renderStudioTextarea();
    expect(screen.getByLabelText(label)).toBeInTheDocument();
    const labelElement = screen.getByText(label);
    expect(labelElement).not.toHaveClass('requiredTag');
  });

  it('should render a textarea with required text when required is true and required is true', () => {
    const tagText: string = 'Required';
    renderStudioTextarea({
      required: true,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });

  it('should render a textarea with required text when required is false and required is true', () => {
    const tagText: string = 'Optional';
    renderStudioTextarea({
      required: false,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });

  it('should render a textarea using aria-label if provided', () => {
    const ariaLabel: string = 'aria label';
    renderStudioTextarea({ 'aria-label': ariaLabel });
    expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
  });

  it('should render a textarea using aria-labelledby if provided', () => {
    const labelledById: string = 'external-label';
    renderStudioTextarea({
      'aria-labelledby': labelledById,
    });
    const input: HTMLTextAreaElement = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-labelledby', labelledById);
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    renderStudioTextarea();

    const input: HTMLTextAreaElement = screen.getByLabelText(label);
    const inputValue: string = 'test';
    await user.type(input, inputValue);
    expect(input).toHaveValue(inputValue);
  });

  it('should apply the description when provided and give it an id', () => {
    const description: string = 'This is a description';
    renderStudioTextarea({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
    const descriptionElement: HTMLParagraphElement = screen.getByText(description);
    expect(descriptionElement).toHaveAttribute('id');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', descriptionElement.id);
  });

  it('should apply the error message when provided and display it', () => {
    const error: string = 'This is an error';
    renderStudioTextarea({ error });
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className: string) => renderStudioTextarea({ className }));
  });

  it('should forward the rest of the props to the input', () => {
    const getTextbox = (): HTMLTextAreaElement =>
      screen.getByRole('textbox') as HTMLTextAreaElement;
    testCustomAttributes<HTMLTextAreaElement>(renderStudioTextarea, getTextbox);
  });
});

const defaultProps: StudioTextareaProps = {
  label,
};

const renderStudioTextarea = (props: Partial<StudioTextareaProps> = {}): RenderResult => {
  return render(<StudioTextarea {...defaultProps} {...props} />);
};

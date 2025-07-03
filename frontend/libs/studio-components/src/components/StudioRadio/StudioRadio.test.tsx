import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioRadio } from './StudioRadio';
import type { StudioRadioProps } from './StudioRadio';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const label: string = 'Radio';
const ariaLabel = `aria label`;

describe('StudioRadio', () => {
  it('Renders a radio', () => {
    renderStudioRadio({ label });
    expect(getRadio()).toBeInTheDocument();
  });

  it('Renders the label', () => {
    renderStudioRadio({ label });
    expect(getRadio()).toHaveAccessibleName(label);
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderStudioRadio({ label }, ref), getRadio);
  });

  it('Appends custom attributes', () => {
    testCustomAttributes(renderStudioRadio, getRadio);
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderStudioRadio({ label, className }));
  });

  it('should render with aria-label when it is provided', () => {
    renderStudioRadio({ 'aria-label': ariaLabel });
    expect(getRadio()).toHaveAccessibleName(ariaLabel);
  });

  it('should render with required text when required is true and required is true', () => {
    const tagText: string = 'Required';
    renderStudioRadio({
      label,
      required: true,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });

  it('should render with required text when required is false and required is true', () => {
    const tagText: string = 'Optional';
    renderStudioRadio({
      label,
      required: false,
      tagText,
    });
    const tag: HTMLElement = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('requiredTag');
  });
});

function renderStudioRadio(props: StudioRadioProps, ref?: Ref<HTMLInputElement>): RenderResult {
  return render(<StudioRadio {...props} ref={ref} />);
}

function getRadio(): HTMLInputElement {
  return screen.getByRole('radio');
}

import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCheckbox } from './StudioCheckbox';
import type { StudioCheckboxProps } from './StudioCheckbox';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const label: string = 'Checkbox';

describe('StudioCheckbox', () => {
  it('Renders a checkbox', () => {
    renderCheckbox({ label });
    expect(getCheckbox()).toBeInTheDocument();
  });

  it('Renders the label', () => {
    renderCheckbox({ label });
    expect(getCheckbox()).toHaveAccessibleName(label);
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderCheckbox({ label }, ref), getCheckbox);
  });

  it('Appends custom attributes', () => {
    testCustomAttributes(renderCheckbox, getCheckbox);
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderCheckbox({ label, className }));
  });

  it('Renders required text when provided', () => {
    const tagText: string = 'Required';
    renderCheckbox({ label, required: true, tagText });
    expect(screen.getByText(tagText)).toBeInTheDocument();
  });

  it('Does not use StudioLabelWrapper when aria-label is provided', () => {
    const tagText: string = 'Required';
    renderCheckbox({ 'aria-label': label, tagText });
    expect(screen.queryByText(tagText)).not.toBeInTheDocument();
  });
});

function renderCheckbox(props: StudioCheckboxProps, ref?: Ref<HTMLInputElement>): RenderResult {
  return render(<StudioCheckbox {...props} ref={ref} />);
}

function getCheckbox(): HTMLInputElement {
  return screen.getByRole('checkbox');
}

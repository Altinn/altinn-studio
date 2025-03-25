import type { StudioCheckboxProps } from './';
import { StudioCheckbox } from './';
import type { ForwardedRef } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { getRootElementFromContainer } from '../../test-utils/selectors';

// Test data:
const value = 'checkbox';
const defaultProps: StudioCheckboxProps = { value };

// Design system data:
const smallCheckboxClass = 'fds-checkbox--sm';
const largeCheckboxClass = 'fds-checkbox--lg';

describe('StudioCheckbox', () => {
  it('Renders a checkbox', () => {
    renderCheckbox();
    expect(getCheckbox()).toBeInTheDocument();
  });

  it('Renders the label', () => {
    const label = 'Checkbox';
    renderCheckbox({ children: label });
    expect(getCheckbox()).toHaveAccessibleName(label);
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderCheckbox({}, ref), getCheckbox);
  });

  it('Appends custom attributes', () => {
    testCustomAttributes(renderCheckbox, getCheckbox);
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderCheckbox({ className }));
  });

  it('Renders as small by default', () => {
    const { container } = renderCheckbox();
    expect(getRootElementFromContainer(container)).toHaveClass(smallCheckboxClass);
  });

  it('Renders with the given size', () => {
    const { container } = renderCheckbox({ size: 'lg' });
    expect(getRootElementFromContainer(container)).toHaveClass(largeCheckboxClass);
  });

  describe('When rendered within StudioCheckbox.Group', () => {
    it('Renders as small when no sizes are specified', () => {
      const { container } = render(
        <StudioCheckbox.Group legend='Test'>
          <StudioCheckbox {...defaultProps} />
        </StudioCheckbox.Group>,
      );
      expect(container.getElementsByClassName(smallCheckboxClass)).toHaveLength(1); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
    });

    it('Renders with the size of the group when no size is specified for the checkbox', () => {
      const { container } = render(
        <StudioCheckbox.Group size='lg' legend='Test'>
          <StudioCheckbox {...defaultProps} />
        </StudioCheckbox.Group>,
      );
      expect(container.getElementsByClassName(largeCheckboxClass)).toHaveLength(1); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
    });

    it('Renders with the given size when an explicit size is specified', () => {
      const { container } = render(
        <StudioCheckbox.Group size='md' legend='Test'>
          <StudioCheckbox {...defaultProps} size='lg' />
        </StudioCheckbox.Group>,
      );
      expect(container.getElementsByClassName(largeCheckboxClass)).toHaveLength(1); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
    });
  });
});

function renderCheckbox(
  props: Partial<StudioCheckboxProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult {
  return render(<StudioCheckbox {...defaultProps} {...props} ref={ref} />);
}

function getCheckbox(): HTMLInputElement {
  return screen.getByRole('checkbox');
}

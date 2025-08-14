import type { ForwardedRef } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeader } from '../';
import { StudioPopover } from '../../';
import userEvent from '@testing-library/user-event';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';
import type { StudioPageHeaderPopoverTriggerProps } from './StudioPageHeaderPopoverTrigger';
import { testRootClassNameAppending } from '../../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../../test-utils/testCustomAttributes';

// Test data:
const triggerText = 'Trigger';
const contentText = 'Content';
const defaultProps: StudioPageHeaderPopoverTriggerProps = {
  children: triggerText,
};

describe('StudioPageHeader.PopoverTrigger', () => {
  it('Renders the trigger button', () => {
    renderPopover();
    expect(screen.getByRole('button', { name: triggerText })).toBeInTheDocument();
  });

  it('Does not display the popover by default', () => {
    renderPopover();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Opens the popover when the user clicks the trigger', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole('button', { name: triggerText }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(contentText);
  });

  it('Forwards the ref to the trigger button', () => {
    testRefForwarding<HTMLButtonElement>((ref) => renderPopoverTrigger({}, ref));
  });

  it('Appends the given className to the trigger button', () => {
    testRootClassNameAppending((className) => renderPopoverTrigger({ className }));
  });

  it('Accepts custom attributes', () => {
    testCustomAttributes(renderPopoverTrigger);
  });
});

function renderPopover(): RenderResult {
  return render(
    <StudioPopover>
      <StudioPageHeader.PopoverTrigger {...defaultProps} />
      <StudioPopover>{contentText}</StudioPopover>
    </StudioPopover>,
  );
}

function renderPopoverTrigger(
  props: StudioPageHeaderPopoverTriggerProps,
  ref?: ForwardedRef<HTMLButtonElement>,
): RenderResult {
  return render(<StudioPageHeader.PopoverTrigger {...defaultProps} {...props} ref={ref} />);
}

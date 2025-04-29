import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioPopover } from './';
import type { StudioPopoverProps, StudioPopoverTriggerProps } from './StudioPopover';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const mockTriggerText: string = 'Test message';
const mockContentText: string = 'Hello';

describe('StudioPopover', () => {
  it('renders children correctly', () => {
    renderStudioPopover();
    expect(getText(mockTriggerText)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioPopover({ triggerProps: { className } }));
  });
});

type renderProps = {
  props?: Partial<StudioPopoverProps>;
  triggerProps?: Partial<StudioPopoverTriggerProps>;
  triggerContextProps?: Partial<StudioPopoverProps>;
};
const renderStudioPopover = ({
  props,
  triggerProps,
  triggerContextProps,
}: renderProps = {}): RenderResult => {
  return render(
    <StudioPopover.TriggerContext {...triggerContextProps}>
      <StudioPopover.Trigger {...triggerProps}>{mockTriggerText}</StudioPopover.Trigger>
      <StudioPopover {...props}>{mockContentText}</StudioPopover>
    </StudioPopover.TriggerContext>,
  );
};

const getText = (text: string): HTMLElement => screen.getByText(text);

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioHelpText } from './StudioHelpText';
import type { StudioHelpTextProps } from './StudioHelpText';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import userEvent from '@testing-library/user-event';

const mockText: string = 'Test Text';

const defaultProps: StudioHelpTextProps = {
  placement: 'right',
  'aria-label': 'test-label',
};

describe('StudioHelpText', () => {
  it('renders children correctly', () => {
    renderField();
    expect(screen.getByText(mockText)).toBeInTheDocument();
  });

  it('applies custom placement correctly', async () => {
    const user = userEvent.setup();
    renderField({ placement: 'left' });
    await user.click(screen.getByText(mockText));
    expect(screen.getByRole('dialog').getAttribute('data-placement')).toBe('left');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderField({ className }));
  });

  it('Appends custom attributes to the field element', () => {
    testCustomAttributes(renderField);
  });
});

const renderField = (props: Partial<StudioHelpTextProps> = {}): RenderResult => {
  return render(
    <StudioHelpText {...defaultProps} {...props}>
      {mockText}
    </StudioHelpText>,
  );
};

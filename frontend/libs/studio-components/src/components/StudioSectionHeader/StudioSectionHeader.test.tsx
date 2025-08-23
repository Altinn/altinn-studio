import React from 'react';
import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSectionHeader, type StudioSectionHeaderProps } from './StudioSectionHeader';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioSectionHeader', () => {
  it('should display icon if provided', () => {
    renderStudioSectionHeader({ icon: <div data-testid='icon' /> });
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should display heading text', () => {
    renderStudioSectionHeader({ heading: { text: 'Heading' } });
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });

  it('should be able to set heading level', () => {
    renderStudioSectionHeader({ heading: { text: 'Heading', level: 3 } });
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('should display help text', () => {
    renderStudioSectionHeader({ helpText: { text: 'Help text1', title: 'Help text title' } });
    expect(screen.getByRole('button', { name: 'Help text title' })).toBeInTheDocument();
  });

  it('should be able to pass HTMLDivElement attributes', () => {
    testCustomAttributes<HTMLDivElement>(renderStudioSectionHeader);
  });

  it('should be possible to use the ref-api to get the underlying HTMLDivElement', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioSectionHeader({ ref }));
  });
});

const renderStudioSectionHeader = (
  props: Partial<
    StudioSectionHeaderProps & {
      ref?: ForwardedRef<HTMLDivElement>;
    }
  > = {},
): RenderResult => {
  const defaultProps: StudioSectionHeaderProps = {
    heading: {
      text: '',
    },
    helpText: {
      text: '',
      title: '',
    },
  };
  return render(<StudioSectionHeader {...defaultProps} {...props} data-testid='headerTestId' />);
};

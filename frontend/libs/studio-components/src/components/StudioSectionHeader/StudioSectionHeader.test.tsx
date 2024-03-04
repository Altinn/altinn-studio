import React, { type ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioSectionHeader, type StudioSectionHeaderProps } from './StudioSectionHeader';

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
    renderStudioSectionHeader({ className: 'test-class-name' });
    expect(screen.getByTestId('headerTestId')).toHaveClass('test-class-name');
  });

  it('should be possible to use the ref-api to get the underlying HTMLDivElement', () => {
    const ref = React.createRef<HTMLDivElement>();
    renderStudioSectionHeader({ ref });
    expect(ref.current).toBeInTheDocument();
  });
});

const renderStudioSectionHeader = (
  props: Partial<
    StudioSectionHeaderProps & {
      ref?: ForwardedRef<HTMLDivElement>;
    }
  > = {},
) => {
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

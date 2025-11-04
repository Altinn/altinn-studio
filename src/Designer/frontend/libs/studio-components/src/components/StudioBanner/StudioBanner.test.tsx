import React from 'react';
import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioBanner } from './StudioBanner';
import type { StudioBannerProps } from './StudioBanner';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

// Test data
const title = 'Banner Title';
const description = 'Banner description text';
const childrenText = 'Banner content';
const actionsText = 'Action buttons';
const defaultProps: StudioBannerProps = { title };

describe('StudioBanner', () => {
  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderBanner({}, ref));
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderBanner({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes((customAttributes) => renderBanner({ ...customAttributes }));
  });

  it('should render title', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    renderBanner({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    renderBanner();
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });

  it('should render children when provided', () => {
    renderBanner({ children: <div>{childrenText}</div> });
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    renderBanner({ actions: <button>{actionsText}</button> });
    expect(screen.getByRole('button', { name: actionsText })).toBeInTheDocument();
  });

  it('should not render when isVisible is false', () => {
    renderBanner({ isVisible: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isVisible is true', () => {
    renderBanner({ isVisible: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render by default (isVisible not specified)', () => {
    renderBanner();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have role="dialog" attribute', () => {
    renderBanner();
    const banner = screen.getByRole('dialog');
    expect(banner).toBeInTheDocument();
  });

  it('should render all parts together', () => {
    renderBanner({
      description,
      children: <div>{childrenText}</div>,
      actions: <button>{actionsText}</button>,
    });

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByText(childrenText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: actionsText })).toBeInTheDocument();
  });
});

const renderBanner = (
  props: Partial<StudioBannerProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => {
  return render(<StudioBanner {...defaultProps} {...props} ref={ref} />);
};

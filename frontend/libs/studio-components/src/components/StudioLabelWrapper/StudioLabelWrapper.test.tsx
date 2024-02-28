import React from 'react';
import { StudioLabelWrapper } from './StudioLabelWrapper';
import { render, screen } from '@testing-library/react';

jest.mock('./StudioLabelWrapper.module.css', () => ({
  studioLabelWrapper: 'studioLabelWrapper',
  withAsterisk: 'withAsterisk',
}));

/* eslint-disable testing-library/no-node-access */
describe('StudioLabelWrapper', () => {
  it('Renders with given label', () => {
    const label = 'test-label';
    render(<StudioLabelWrapper>{label}</StudioLabelWrapper>);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Renders with withAsterisk class when "withAsterisk" is set', () => {
    const { container } = render(<StudioLabelWrapper withAsterisk>Test</StudioLabelWrapper>);
    expect(container.firstChild).toHaveClass('withAsterisk');
  });

  it.each([false, undefined])(
    'Renders without withAsterisk class when "withAsterisk" is %s',
    (withAsterisk) => {
      const { container } = render(
        <StudioLabelWrapper withAsterisk={withAsterisk}>Test</StudioLabelWrapper>,
      );
      expect(container.firstChild).not.toHaveClass('withAsterisk');
    },
  );

  it('Appends given classname to internal classname', () => {
    const className = 'test-class';
    const { container } = render(
      <StudioLabelWrapper className={className}>Test</StudioLabelWrapper>,
    );
    expect(container.firstChild).toHaveClass(className);
    expect(container.firstChild).toHaveClass('studioLabelWrapper');
  });

  it('Forwards the ref object to the span element if given', () => {
    const ref = React.createRef<HTMLSpanElement>();
    const { container } = render(<StudioLabelWrapper ref={ref}>Test</StudioLabelWrapper>);
    expect(ref.current).toBe(container.firstChild);
  });
});

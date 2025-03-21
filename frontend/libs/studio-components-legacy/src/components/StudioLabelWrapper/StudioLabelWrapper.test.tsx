import React from 'react';
import { StudioLabelWrapper } from './StudioLabelWrapper';
import { render, screen } from '@testing-library/react';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

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
    testRootClassNameAppending((className) => render(<StudioLabelWrapper className={className} />));
  });

  it('Forwards the ref object to the span element if given', () => {
    testRefForwarding<HTMLSpanElement>((ref) => render(<StudioLabelWrapper ref={ref} />));
  });
});

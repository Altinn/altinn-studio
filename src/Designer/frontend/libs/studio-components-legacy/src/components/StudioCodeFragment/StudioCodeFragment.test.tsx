import type { ForwardedRef } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCodeFragment } from './StudioCodeFragment';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

jest.mock('./StudioCodeFragment.module.css', () => ({
  code: 'code',
}));

/* eslint-disable testing-library/no-node-access */
describe('StudioCodeFragment', () => {
  it('Renders the given content', () => {
    const content = 'Test';
    render(<StudioCodeFragment>{content}</StudioCodeFragment>);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => render(<StudioCodeFragment className={className} />));
  });

  it('Adds any additonal props to the element', () => {
    const renderComponent = (attributes) => render(<StudioCodeFragment {...attributes} />);
    testCustomAttributes(renderComponent);
  });

  it('Forwards the ref object to the code element if given', () => {
    const renderComponent = (ref: ForwardedRef<HTMLElement>) =>
      render(<StudioCodeFragment ref={ref} />);
    testRefForwarding(renderComponent);
  });
});

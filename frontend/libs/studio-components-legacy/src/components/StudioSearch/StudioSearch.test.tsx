import React, { type ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioSearchProps } from './StudioSearch';
import { StudioSearch } from './StudioSearch';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioSearch', () => {
  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderTestSearch({}, ref), getSearchBox);
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderTestSearch({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes(renderTestSearch, getSearchBox);
  });

  it('should render search field with label name when provided', () => {
    const label = 'Search for something';
    renderTestSearch({ label });
    const search = screen.getByRole('searchbox', { name: label });
    expect(search).toBeInTheDocument();
  });

  it('should render search field with label name when ID is set through props', () => {
    const label = 'Search for something';
    const id = 'searchId';
    renderTestSearch({ label, id });
    const search = screen.getByRole('searchbox', { name: label });
    expect(search).toBeInTheDocument();
  });
});

const renderTestSearch = (
  props: Partial<StudioSearchProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
) => {
  return render(<StudioSearch {...props} ref={ref} />);
};

function getSearchBox(): HTMLInputElement {
  return screen.getByRole('searchbox');
}

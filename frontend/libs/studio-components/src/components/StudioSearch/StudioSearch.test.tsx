import React, { type ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSearch, type StudioSearchProps } from './StudioSearch';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioSearch', () => {
  it('renders search input with label', () => {
    renderStudioSearch();
    const searchInput = screen.getByRole('searchbox', { name: 'Search' });
    expect(searchInput).toBeInTheDocument();
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderStudioSearch({}, ref), getSearchBox);
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderStudioSearch({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes(renderStudioSearch, getSearchBox);
  });

  it('should render search field with label name when provided', () => {
    const label = 'Search for something';
    renderStudioSearch({ label });
    const search = screen.getByRole('searchbox', { name: label });
    expect(search).toBeInTheDocument();
  });

  it('should render search field with label name when ID is set through props', () => {
    const label = 'Search for something';
    const id = 'searchId';
    renderStudioSearch({ label, id });
    const search = screen.getByRole('searchbox', { name: label });
    expect(search).toBeInTheDocument();
  });

  const defaultProps: StudioSearchProps = {
    label: 'Search',
    clearButtonLabel: 'Clear search',
  };

  const renderStudioSearch = (
    props: Partial<StudioSearchProps> = {},
    ref?: ForwardedRef<HTMLInputElement>,
  ): RenderResult => {
    return render(<StudioSearch {...defaultProps} {...props} ref={ref} />);
  };

  function getSearchBox(): HTMLInputElement {
    return screen.getByRole('searchbox');
  }
});

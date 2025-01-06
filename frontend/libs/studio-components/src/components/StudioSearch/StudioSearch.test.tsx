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

import React, { forwardRef } from 'react';
import { Search, type SearchProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioSearchProps = WithoutAsChild<SearchProps>;

const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ size = 'sm', ...rest }, ref) => {
    return <Search {...rest} size={size} ref={ref} />;
  },
);

StudioSearch.displayName = 'StudioSearch';

export { StudioSearch };

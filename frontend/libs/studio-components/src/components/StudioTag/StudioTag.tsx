import React from 'react';
import type { ReactElement } from 'react';
import { Tag, type TagProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioTagProps = WithoutAsChild<TagProps>;

export function StudioTag({ children, ...rest }: StudioTagProps): ReactElement {
  return <Tag {...rest}>{children}</Tag>;
}

import React from 'react';
import type { ReactElement } from 'react';
import { FieldsetLegend } from '@digdir/designsystemet-react';
import type { FieldsetLegendProps } from '@digdir/designsystemet-react';

export type StudioFieldsetLegendProps = FieldsetLegendProps;

export function StudioFieldsetLegend({
  children,
  ...rest
}: StudioFieldsetLegendProps): ReactElement {
  return <FieldsetLegend {...rest}>{children}</FieldsetLegend>;
}

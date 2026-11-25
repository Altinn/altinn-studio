import { Divider as DsDivider } from '@digdir/designsystemet-react';

import { ComponentStructure } from '../common/ComponentStructure';
import type { IGridStyling } from '../../app-components/Flex';

export interface DividerProps {
  componentId: string;
  innerGrid?: IGridStyling;
}

export function Divider({ componentId, innerGrid }: DividerProps) {
  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <DsDivider />
    </ComponentStructure>
  );
}

import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Divider as DsDivider } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

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

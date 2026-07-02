import type { ReactNode } from 'react';

import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Divider as DsDivider } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export interface DividerProps {
  componentId: string;
  innerGrid?: IGridStyling;
  validationGrid?: IGridStyling;
  validationMessages?: ReactNode;
}

export function Divider({
  componentId,
  innerGrid,
  validationGrid,
  validationMessages,
}: DividerProps) {
  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      <DsDivider />
    </ComponentStructure>
  );
}

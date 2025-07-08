import React from 'react';

import { Divider } from '@digdir/designsystemet-react';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import type { PropsFromGenericComponent } from 'src/layout/index';

export function DividerComponent({ baseComponentId }: PropsFromGenericComponent<'Divider'>) {
  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Divider />
    </ComponentStructureWrapper>
  );
}

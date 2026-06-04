import React from 'react';

import { Divider } from '@app/form-component';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout/index';

export function DividerComponent({ baseComponentId }: PropsFromGenericComponent<'Divider'>) {
  const { id } = useItemWhenType(baseComponentId, 'Divider');

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Divider id={id} />
    </ComponentStructureWrapper>
  );
}

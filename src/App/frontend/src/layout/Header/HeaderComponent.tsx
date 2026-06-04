import React from 'react';

import { Header } from '@app/form-component';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const HeaderComponent = ({ baseComponentId }: PropsFromGenericComponent<'Header'>) => {
  const { id, size, textResourceBindings } = useItemWhenType(baseComponentId, 'Header');

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Header
        id={id}
        title={textResourceBindings?.title}
        help={textResourceBindings?.help}
        size={size}
      />
    </ComponentStructureWrapper>
  );
};

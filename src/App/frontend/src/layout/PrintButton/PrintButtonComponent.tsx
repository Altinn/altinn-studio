import React from 'react';

import { Button } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export const PrintButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'PrintButton'>) => {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'PrintButton');

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Button
        variant='secondary'
        color='first'
        onClick={window.print}
      >
        <Lang id={textResourceBindings?.title ?? 'general.print_button_text'} />
      </Button>
    </ComponentStructureWrapper>
  );
};

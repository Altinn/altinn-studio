import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { Button } from 'src/app-components/Button/Button';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';

export const PrintButtonComponent = ({ node }: PropsFromGenericComponent<'PrintButton'>) => {
  const { textResourceBindings } = useNodeItem(node);

  return (
    <ComponentStructureWrapper node={node}>
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

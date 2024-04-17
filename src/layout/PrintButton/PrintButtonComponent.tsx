import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import type { PropsFromGenericComponent } from '..';

import { Lang } from 'src/features/language/Lang';
import { LayoutPage } from 'src/utils/layout/LayoutPage';

export const PrintButtonComponent = ({ node }: PropsFromGenericComponent<'PrintButton'>) => {
  const { textResourceBindings } = node.item;
  const parentIsPage = node.parent instanceof LayoutPage;

  return (
    <Button
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
      variant='secondary'
      color='first'
      size='small'
      onClick={window.print}
    >
      <Lang id={textResourceBindings?.title ?? 'general.print_button_text'} />
    </Button>
  );
};

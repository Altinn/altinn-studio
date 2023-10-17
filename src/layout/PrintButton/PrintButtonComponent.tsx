import React from 'react';

import { Button } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { useLanguage } from 'src/hooks/useLanguage';
import { LayoutPage } from 'src/utils/layout/LayoutPage';

export const PrintButtonComponent = ({ node }: PropsFromGenericComponent<'PrintButton'>) => {
  const { lang } = useLanguage();
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
      {lang(textResourceBindings?.title ?? 'general.print_button_text')}
    </Button>
  );
};

import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { LayoutPage } from 'src/utils/layout/LayoutPage';

export const PrintButtonComponent = (props: PropsFromGenericComponent<'PrintButton'>) => {
  const language = useAppSelector((state) => state.language.language);

  if (!language) {
    return null;
  }
  const parentIsPage = props.node.parent instanceof LayoutPage;

  const text = props.text ?? getLanguageFromKey('general.print_button_text', language);

  return (
    <Button
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
      variant={ButtonVariant.Outline}
      color={ButtonColor.Primary}
      onClick={window.print}
    >
      {text}
    </Button>
  );
};

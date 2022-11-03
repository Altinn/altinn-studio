import React from 'react';

import { Button, ButtonVariant } from '@altinn/altinn-design-system';

import { useAppSelector } from 'src/common/hooks';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

export const PrintButtonComponent = () => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      onClick={window.print}
    >
      {language && getTextFromAppOrDefault('general.print_button_text', textResources, language, undefined, true)}
    </Button>
  );
};

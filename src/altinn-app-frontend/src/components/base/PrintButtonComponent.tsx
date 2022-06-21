import React from 'react';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { useAppSelector } from 'src/common/hooks';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';

export const PrintButtonComponent = () => {
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const language = useAppSelector((state) => state.language.language);

  return (
    <Button variant={ButtonVariant.Secondary} onClick={window.print}>
      {getTextFromAppOrDefault(
        'general.print_button_text',
        textResources,
        language,
        null,
        true,
      )}
    </Button>
  );
};

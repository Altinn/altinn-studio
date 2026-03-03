import React from 'react';

import { Button as AppButton } from 'src/app-components/Button/Button';
import { useProcessActions } from 'nextsrc/features/process/ProcessActionsContext';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompButtonExternal } from 'src/layout/Button/config.generated';

export const Button = ({ component }: ComponentProps) => {
  const props = component as CompButtonExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const processActions = useProcessActions();

  const isSubmit = props.mode === 'submit';

  const handleClick = () => {
    if (isSubmit) {
      processActions?.submit();
    }
  };

  return (
    <AppButton
      title={asTranslationKey(titleKey)}
      onClick={handleClick}
      isLoading={isSubmit && !!processActions?.isSubmitting}
    >
      {title}
    </AppButton>
  );
};

import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { useProcessActions } from 'nextsrc/features/process/ProcessActionsContext';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompActionButtonExternal } from 'src/layout/ActionButton/config.generated';

export const ActionButton = ({ component }: ComponentProps) => {
  const props = component as CompActionButtonExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const processActions = useProcessActions();

  const handleClick = () => {
    processActions?.submit();
  };

  return (
    <Button
      onClick={handleClick}
      loading={processActions?.isSubmitting}
    >
      {title || props.action}
    </Button>
  );
};

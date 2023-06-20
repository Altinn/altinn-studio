import React from 'react';

import { ConfirmButton } from 'src/features/confirm/components/ConfirmButton';

export const ProcessNavigation = () => {
  const confirmButtonId = 'confirm-button';

  return (
    <div className={'process-navigation'}>
      <ConfirmButton id={confirmButtonId} />
    </div>
  );
};

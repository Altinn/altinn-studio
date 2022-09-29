import React from 'react';

import { ConfirmButton } from 'src/features/confirm/components/ConfirmButton';

export const ProcessNavigation = ({ language }) => {
  const confirmButtonId = 'confirm-button';

  return (
    <div className={'process-navigation'}>
      <ConfirmButton
        language={language}
        id={confirmButtonId}
      />
    </div>
  );
};

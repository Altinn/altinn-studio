import React from 'react';

import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import type { MissingRowIdException } from 'src/features/formData/MissingRowIdException';

export const MissingRowIdView = ({ error }: { error: MissingRowIdException }) => {
  const { langAsString } = useLanguage();
  window.logErrorOnce(langAsString('missing_row_id_error.full_message', [ALTINN_ROW_ID, error.path]));

  return (
    <InstantiationErrorPage
      title={<Lang id='missing_row_id_error.title' />}
      content={<Lang id='missing_row_id_error.message' />}
      showContactInfo={true}
    />
  );
};

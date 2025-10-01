import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';

export function ForbiddenError() {
  const { langAsString } = useLanguage();

  return (
    <InstantiationErrorPage
      title={<Lang id='instantiate.forbidden_action_error_title' />}
      content={<Lang id='instantiate.forbidden_action_error_text' />}
      showContactInfo={true}
      statusCode={langAsString('instantiate.forbidden_action_error_status')}
    />
  );
}

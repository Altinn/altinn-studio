import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useLanguage } from 'src/hooks/useLanguage';

export function ForbiddenError() {
  const { lang, langAsString } = useLanguage();

  const createForbiddenErrorContent = (): JSX.Element => {
    const customerSupport = langAsString('instantiate.forbidden_action_error_customer_support', [
      langAsString('general.customer_service_phone_number'),
    ]);

    return (
      <>
        {lang('instantiate.forbidden_action_error_text')}
        <br />
        <br />
        {customerSupport}
      </>
    );
  };

  return (
    <InstantiationErrorPage
      title={lang('instantiate.forbidden_action_error_title')}
      content={createForbiddenErrorContent()}
      statusCode={langAsString('instantiate.forbidden_action_error_status')}
    />
  );
}

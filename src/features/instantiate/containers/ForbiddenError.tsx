import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';

export function ForbiddenError() {
  const { langAsString } = useLanguage();

  const createForbiddenErrorContent = (): JSX.Element => {
    const customerSupport = langAsString('instantiate.forbidden_action_error_customer_support', [
      langAsString('general.customer_service_phone_number'),
    ]);

    return (
      <>
        <Lang id={'instantiate.forbidden_action_error_text'} />
        <br />
        <br />
        {customerSupport}
      </>
    );
  };

  return (
    <InstantiationErrorPage
      title={<Lang id={'instantiate.forbidden_action_error_title'} />}
      content={createForbiddenErrorContent()}
      statusCode={langAsString('instantiate.forbidden_action_error_status')}
    />
  );
}

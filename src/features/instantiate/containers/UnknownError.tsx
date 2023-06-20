import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useLanguage } from 'src/hooks/useLanguage';

export function UnknownError() {
  const { lang, langAsString } = useLanguage();

  const createUnknownErrorContent = (): JSX.Element => {
    const customerSupport = lang('instantiate.unknown_error_customer_support', [
      langAsString('general.customer_service_phone_number'),
    ]);

    return (
      <>
        {lang('instantiate.unknown_error_text')}
        <br />
        <br />
        {customerSupport}
      </>
    );
  };

  return (
    <InstantiationErrorPage
      title={lang('instantiate.unknown_error_title')}
      content={createUnknownErrorContent()}
      statusCode={langAsString('instantiate.unknown_error_status')}
    />
  );
}

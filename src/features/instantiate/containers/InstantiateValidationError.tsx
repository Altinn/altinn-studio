import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useLanguage } from 'src/hooks/useLanguage';

export function InstantiateValidationError(props: { message: string }) {
  const { lang, langAsString } = useLanguage();

  function createErrorContent() {
    const errorCustomerService = langAsString(
      'instantiate.authorization_error_instantiate_validation_info_customer_service',
      [langAsString('general.customer_service_phone_number')],
    );
    const customErrorMessage = props.message && lang(props.message);

    return (
      <>
        <span>{customErrorMessage}</span>
        <br />
        <br />
        <span>{errorCustomerService}</span>
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={lang('instantiate.authorization_error_instantiate_validation_title')}
      content={createErrorContent()}
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

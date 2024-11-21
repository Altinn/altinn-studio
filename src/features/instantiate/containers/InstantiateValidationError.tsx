import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';

export function InstantiateValidationError(props: { message: string }) {
  const { langAsString } = useLanguage();

  function createErrorContent() {
    const errorCustomerService = langAsString(
      'instantiate.authorization_error_instantiate_validation_info_customer_service',
      [langAsString('general.customer_service_phone_number')],
    );
    return (
      <>
        <span>{props.message && <Lang id={props.message} />}</span>
        <br />
        <br />
        <span>{errorCustomerService}</span>
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={<Lang id='instantiate.authorization_error_instantiate_validation_title' />}
      content={createErrorContent()}
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

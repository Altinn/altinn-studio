import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';

export function InstantiateValidationError(props: { message: string }) {
  const { langAsString } = useLanguage();

  return (
    <InstantiationErrorPage
      title={<Lang id='instantiate.authorization_error_instantiate_validation_title' />}
      content={
        <>
          {props.message && <Lang id={props.message} />}
          <br />
          <br />
          <Lang
            id='instantiate.authorization_error_instantiate_validation_info_customer_service'
            params={[langAsString('general.customer_service_phone_number')]}
          />
        </>
      }
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

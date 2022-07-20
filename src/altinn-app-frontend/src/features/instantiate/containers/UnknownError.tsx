import * as React from 'react';

import { useAppSelector } from 'src/common/hooks';
import InstantiationErrorPage from 'src/features/instantiate/containers/InstantiationErrorPage';

import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'altinn-shared/utils';

function UnknownError() {
  const language = useAppSelector((state) => state.language.language);
  if (!language) {
    return null;
  }

  function getUnknownErrorContent() {
    const customerSupport = getParsedLanguageFromKey(
      'instantiate.unknown_error_customer_support',
      language,
      [getLanguageFromKey('general.customer_service_phone_number', language)],
    );

    return (
      <>
        {getLanguageFromKey('instantiate.unknown_error_text', language)}
        <br />
        <br />
        {customerSupport}
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={getLanguageFromKey('instantiate.unknown_error_title', language)}
      content={getUnknownErrorContent()}
      statusCode={getLanguageFromKey(
        'instantiate.unknown_error_status',
        language,
      )}
    />
  );
}
export default UnknownError;

import * as React from 'react';
import { getParsedLanguageFromKey } from 'altinn-shared/utils';
import InstantiationErrorPage from './InstantiationErrorPage';
import { useAppSelector } from 'src/common/hooks';

function UnknownError() {
  const language = useAppSelector(state => state.language.language);
  if (!language) {
    return null;
  }

  function getUnknownErrorContent() {
    const customerSupport = getParsedLanguageFromKey(
      'instantiate.unknown_error_customer_support',
      language,
      [language.general.customer_service_phone_number],
    );

    return (
      <>
        {language.instantiate.unknown_error_text}
        <br />
        <br />
        {customerSupport}
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={`${language.instantiate.unknown_error_title}`}
      content={getUnknownErrorContent()}
      statusCode={`${language.instantiate.unknown_error_status}`}
    />
  );
}
export default UnknownError;

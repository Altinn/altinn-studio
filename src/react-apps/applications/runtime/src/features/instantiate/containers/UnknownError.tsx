import * as React from 'react';
import { useSelector } from 'react-redux';
import { getParsedLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';
import InstantiationErrorPage from './InstantiationErrorPage';

function UnknownError() {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  if (!language) {
    return null;
  }

  function getUnknownErrorContent() {
    const customerSupport = getParsedLanguageFromKey(
      'instantiate.unknown_error_customer_support',
      language,
      [language.general.customer_service_phone_number]);

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

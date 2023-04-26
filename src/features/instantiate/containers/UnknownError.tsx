import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromCode } from 'src/language/languages';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'src/language/sharedLanguage';

const defaultLocale = 'nb';

export function UnknownError() {
  const fetchedLanguage = useAppSelector((state) => state.language.language);
  const languageFromCode = getLanguageFromCode(defaultLocale);

  // Fallback to default language if fetched language has failed fetching
  const language = fetchedLanguage || languageFromCode;

  const createUnknownErrorContent = (): JSX.Element => {
    const customerSupport = getParsedLanguageFromKey('instantiate.unknown_error_customer_support', language, [
      getLanguageFromKey('general.customer_service_phone_number', language),
    ]);

    return (
      <>
        {getLanguageFromKey('instantiate.unknown_error_text', language)}
        <br />
        <br />
        {customerSupport}
      </>
    );
  };

  return (
    <InstantiationErrorPage
      title={getLanguageFromKey('instantiate.unknown_error_title', language)}
      content={createUnknownErrorContent()}
      statusCode={getLanguageFromKey('instantiate.unknown_error_status', language)}
    />
  );
}

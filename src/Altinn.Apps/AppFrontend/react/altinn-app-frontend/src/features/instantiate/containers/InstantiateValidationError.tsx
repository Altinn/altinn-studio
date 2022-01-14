import * as React from 'react';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';
import InstantiationErrorPage from './InstantiationErrorPage';
import { getTextFromAppOrDefault } from '../../../utils/textResource';
import { useAppSelector } from 'src/common/hooks';

function InstantiateValidationError(props: {message: string}) {
  const language = useAppSelector(state => state.language.language);
  const textResources = useAppSelector(state => state.textResources.resources);
  if (!language) {
    return null;
  }

  function getCustomerService() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_instantiate_validation_info_customer_service',
      language,
      [getLanguageFromKey('general.customer_service_phone_number', language)],
    );
  }

  function getCustomErrorMessage(message: string) {
    if (!message) return null;
    return getTextFromAppOrDefault(message, textResources, language, [], false);
  }

  function createErrorContent() {
    const errorCustomerService = getCustomerService();
    const customErrorMessage = getCustomErrorMessage(props.message);

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
      title={getLanguageFromKey('instantiate.authorization_error_instantiate_validation_title', language)}
      content={createErrorContent()}
      statusCode={`${getLanguageFromKey('party_selection.error_caption_prefix', language)} 403`}
    />
  );
}

export default InstantiateValidationError;

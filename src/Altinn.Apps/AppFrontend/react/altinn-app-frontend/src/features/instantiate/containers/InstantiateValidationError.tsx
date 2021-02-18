import * as React from 'react';
import { useSelector } from 'react-redux';
import { getParsedLanguageFromKey } from 'altinn-shared/utils';
import { IRuntimeState } from '../../../types';
import InstantiationErrorPage from './InstantiationErrorPage';
import { getTextFromAppOrDefault } from '../../../utils/textResource';

function InstantiateValidationError(props: {message: string}) {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  if (!language) {
    return null;
  }

  function getCustomerService() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_instantiate_validation_info_customer_service',
      language,
      [language.general.customer_service_phone_number],
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
      title={language.instantiate.authorization_error_instantiate_validation_title}
      content={createErrorContent()}
      statusCode={`${language.party_selection.error_caption_prefix} 403`}
    />
  );
}

export default InstantiateValidationError;

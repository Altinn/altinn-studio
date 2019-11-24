import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getParsedLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';
import InstantiationErrorPage from './InstantiationErrorPage';

function MissingRolesError() {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);

  if (!language) {
    return null;
  }

  function getErrorRights() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_rights',
      language,
      [selectedParty.name]);
  }

  function getCustomerService() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_info_customer_service',
      language,
      [language.general.customer_service_phone_number]);
  }

  function createErrorContent() {
    const altinnWindow: Window = window;
    const errorRights = getErrorRights();
    const errorChangeParty = <Link to='/partyselection'>{language.party_selection.change_party}</Link>;
    const errorAsk = language.instantiate.authorization_error_ask;

    // environment specific url
    // https://at02.ai.basefarm.net/ui/Profile
    const errorCheckRights = getParsedLanguageFromKey(
      'instantiate.authorization_error_check_rights',
      language,
      []);

    // environment specific url
    // https://www.altinn.no/hjelp/profil/roller-og-rettigheter/
    const errorMoreInfo = getParsedLanguageFromKey('instantiate.authorization_error_info_rights', language, []);
    const errorCustomerService = getCustomerService();
    const newline = getParsedLanguageFromKey('general.newline', language);

    return (
      <>
        <span>{errorRights}({errorChangeParty}). </span>
        <span>{errorAsk} </span>
        <span>{errorCheckRights}</span>
        {newline}
        {newline}
        <span>{errorMoreInfo}</span>
        <span>{errorCustomerService}</span>
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={language.instantiate.authorization_error_main_title}
      content={createErrorContent()}
      statusCode={`${language.party_selection.error_caption_prefix} 403`}
    />
  );
}

export default MissingRolesError;

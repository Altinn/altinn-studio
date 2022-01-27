import * as React from 'react';
import { Link } from 'react-router-dom';
import { getLanguageFromKey, getParsedLanguageFromKey, getParsedLanguageFromText } from 'altinn-shared/utils';
import { getHostname } from '../../../utils/appUrlHelper';
import InstantiationErrorPage from './InstantiationErrorPage';
import { useAppSelector } from 'src/common/hooks';

function MissingRolesError() {
  const language = useAppSelector(state => state.language.language);
  const selectedParty = useAppSelector(state => state.party.selectedParty);

  if (!language) {
    return null;
  }

  function getErrorRights() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_rights',
      language,
      [selectedParty.name],
    );
  }

  function getCustomerService() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_info_customer_service',
      language,
      [getLanguageFromKey('general.customer_service_phone_number', language)],
    );
  }

  function getCheckRights(hostName: string) {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_check_rights',
      language,
      [hostName],
    );
  }

  function getErrorInfoRights(hostName: string) {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_info_rights',
      language,
      [hostName],
    );
  }

  function createErrorContent() {
    const hostName = getHostname();

    const errorRights = getErrorRights();
    const errorChangeParty = <Link to='/partyselection'>{getParsedLanguageFromText(
      getLanguageFromKey('party_selection.change_party', language))}
    </Link>;
    const errorAsk = getParsedLanguageFromText(
      getLanguageFromKey('instantiate.authorization_error_ask', language)
    );
    const errorCheckRights = getCheckRights(hostName);
    const errorMoreInfo = getErrorInfoRights(hostName);
    const errorCustomerService = getCustomerService();

    return (
      <>
        <span>{errorRights} ({errorChangeParty}). </span>
        <br />
        <br />
        <span>{errorAsk} </span>
        <br />
        <span>{errorCheckRights}</span>
        <br />
        <br />
        <span>{errorMoreInfo}</span>
        <span>{errorCustomerService}</span>
      </>
    );
  }

  return (
    <InstantiationErrorPage
      title={getLanguageFromKey('instantiate.authorization_error_main_title', language)}
      content={createErrorContent()}
      statusCode={`${getLanguageFromKey('party_selection.error_caption_prefix', language)} 403`}
    />
  );
}

export default MissingRolesError;

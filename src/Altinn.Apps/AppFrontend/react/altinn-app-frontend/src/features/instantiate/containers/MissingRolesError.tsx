import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getParsedLanguageFromKey } from 'altinn-shared/utils';
import { IRuntimeState } from '../../../types';
import { getHostname } from '../../../utils/urlHelper';
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

  function getCheckRights(hostName: string) {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_check_rights',
      language,
      [hostName]);
  }

  function getErrorInfoRights(hostName: string) {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_info_rights',
      language,
      [hostName]);
  }

  function createErrorContent() {
    const hostName = getHostname();

    const errorRights = getErrorRights();
    const errorChangeParty = <Link to='/partyselection'>{language.party_selection.change_party}</Link>;
    const errorAsk = language.instantiate.authorization_error_ask;
    const errorCheckRights = getCheckRights(hostName);
    const errorMoreInfo = getErrorInfoRights(hostName);
    const errorCustomerService = getCustomerService();

    return (
      <>
        <span>{errorRights}({errorChangeParty}). </span>
        <span>{errorAsk} </span>
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
      title={language.instantiate.authorization_error_main_title}
      content={createErrorContent()}
      statusCode={`${language.party_selection.error_caption_prefix} 403`}
    />
  );
}

export default MissingRolesError;

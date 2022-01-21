import * as React from 'react';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';
import { getHostname } from '../../../utils/urlHelper2';
import InstantiationErrorPage from './InstantiationErrorPage';
import { useAppSelector } from 'src/common/hooks';

function NoValidPartiesError() {
  const language = useAppSelector(state => state.language.language);
  const appMetadata = useAppSelector(state => state.applicationMetadata.applicationMetadata);

  if (!language) {
    return null;
  }

  function getAllowedParties(): string {
    let returnString = '';
    const partyTypes: string[] = [];

    const { partyTypesAllowed } = appMetadata;

    if (partyTypesAllowed.person) {
      partyTypes.push(getLanguageFromKey('party_selection.unit_type_private_person', language));
    }
    if (partyTypesAllowed.organisation) {
      partyTypes.push(getLanguageFromKey('party_selection.unit_type_company', language));
    }
    if (partyTypesAllowed.subUnit) {
      partyTypes.push(getLanguageFromKey('party_selection.unit_type_subunit', language));
    }
    if (partyTypesAllowed.bankruptcyEstate) {
      partyTypes.push(getLanguageFromKey('party_selection.unit_type_bankruptcy_state', language));
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${getLanguageFromKey('party_selection.no_valid_selection_binding_word', language)} ${partyTypes[i]}`;
      } else {
        returnString += `, ${partyTypes[i]} `;
      }
    }

    return returnString;
  }

  function getCustomerService() {
    return getParsedLanguageFromKey(
      'instantiate.authorization_error_info_customer_service',
      language,
      [getLanguageFromKey('general.customer_service_phone_number', language)],
    );
  }

  function getNoAccessError() {
    return getParsedLanguageFromKey(
      'party_selection.no_valid_selection_second_part',
      language,
      [appMetadata.title.nb],
    );
  }

  function getAllowedPartiesError() {
    return getParsedLanguageFromKey(
      'party_selection.no_valid_selection_third_part',
      language,
      [getAllowedParties()],
    );
  }

  function createErrorTitle() {
    // Add party type
    return getParsedLanguageFromKey(
      'party_selection.no_valid_selection_first_part',
      language,
      [getAllowedParties()],
    );
  }

  function createErrorContent() {
    const errorNoAccess = getNoAccessError();
    const errorProperAccess = getAllowedPartiesError();

    // TODO: add url to language (more info)
    const hostName = getHostname();
    const errorMoreInfo = getParsedLanguageFromKey(
      'instantiate.authorization_error_info_rights',
      language,
      [hostName],
    );
    const errorCustomerService = getCustomerService();

    return (
      <>
        <span>{errorNoAccess} </span>
        <span>{errorProperAccess}</span>
        <br />
        <br />
        <span>{errorMoreInfo} </span>
        <span>{errorCustomerService}</span>
      </>
    );
  }

  return (
    <InstantiationErrorPage
        title={createErrorTitle()}
      content={createErrorContent()}
      statusCode={`${getLanguageFromKey('party_selection.error_caption_prefix', language)} 403`}
    />
  );
}

export default NoValidPartiesError;

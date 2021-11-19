import * as React from 'react';
import { useSelector } from 'react-redux';
import { getParsedLanguageFromKey } from 'altinn-shared/utils';
import { IApplicationMetadata } from '../../../shared/resources/applicationMetadata';
import { IRuntimeState } from '../../../types';
import { getHostname } from '../../../utils/urlHelper';
import InstantiationErrorPage from './InstantiationErrorPage';

function NoValidPartiesError() {
  const language = useSelector(
    (state: IRuntimeState) => state.language.language,
  );
  const appMetadata: IApplicationMetadata = useSelector(
    (state: IRuntimeState) => state.applicationMetadata.applicationMetadata,
  );

  if (!language) {
    return null;
  }

  function getAllowedParties(): string {
    let returnString = '';
    const partyTypes: string[] = [];

    const { partyTypesAllowed } = appMetadata;

    if (partyTypesAllowed.person) {
      partyTypes.push(language.party_selection.unit_type_private_person);
    }
    if (partyTypesAllowed.organisation) {
      partyTypes.push(language.party_selection.unit_type_company);
    }
    if (partyTypesAllowed.subUnit) {
      partyTypes.push(language.party_selection.unit_type_subunit);
    }
    if (partyTypesAllowed.bankruptcyEstate) {
      partyTypes.push(language.party_selection.unit_type_bankruptcy_state);
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${language.party_selection.no_valid_selection_binding_word} ${partyTypes[i]}`;
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
      [language.general.customer_service_phone_number],
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
      statusCode={`${language.party_selection.error_caption_prefix} 403`}
    />
  );
}

export default NoValidPartiesError;

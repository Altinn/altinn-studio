import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { getHostname } from 'src/utils/urls/appUrlHelper';

export function NoValidPartiesError() {
  const { lang, langAsString } = useLanguage();
  const appMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);

  function getAllowedParties(): string {
    let returnString = '';
    const partyTypes: string[] = [];

    if (appMetadata) {
      const { partyTypesAllowed } = appMetadata;

      if (partyTypesAllowed.person) {
        partyTypes.push(langAsString('party_selection.unit_type_private_person'));
      }
      if (partyTypesAllowed.organisation) {
        partyTypes.push(langAsString('party_selection.unit_type_company'));
      }
      if (partyTypesAllowed.subUnit) {
        partyTypes.push(langAsString('party_selection.unit_type_subunit'));
      }
      if (partyTypesAllowed.bankruptcyEstate) {
        partyTypes.push(langAsString('party_selection.unit_type_bankruptcy_state'));
      }
    }

    for (let i = 0; i < partyTypes.length; i++) {
      if (i === 0) {
        returnString += partyTypes[i];
      } else if (i === partyTypes.length - 1) {
        returnString += ` ${langAsString('party_selection.no_valid_selection_binding_word')} ${partyTypes[i]}`;
      } else {
        returnString += `, ${partyTypes[i]} `;
      }
    }

    return returnString;
  }

  function getCustomerService() {
    return lang('instantiate.authorization_error_info_customer_service', [
      langAsString('general.customer_service_phone_number'),
    ]);
  }

  function getNoAccessError() {
    return lang('party_selection.no_valid_selection_second_part', [appMetadata?.title.nb]);
  }

  function getAllowedPartiesError() {
    return lang('party_selection.no_valid_selection_third_part', [getAllowedParties()]);
  }

  function createErrorTitle() {
    // Add party type
    return lang('party_selection.no_valid_selection_first_part', [getAllowedParties()]);
  }

  function createErrorContent() {
    const errorNoAccess = getNoAccessError();
    const errorProperAccess = getAllowedPartiesError();

    // TODO: add url to language (more info)
    const hostName = getHostname();
    const errorMoreInfo = lang('instantiate.authorization_error_info_rights', [hostName]);
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
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

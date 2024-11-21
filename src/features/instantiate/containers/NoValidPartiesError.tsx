import React from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getHostname } from 'src/utils/urls/appUrlHelper';

export function NoValidPartiesError() {
  const { langAsString } = useLanguage();
  const appMetadata = useApplicationMetadata();

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

  return (
    <InstantiationErrorPage
      title={
        <Lang
          id='party_selection.no_valid_selection_first_part'
          params={[getAllowedParties()]}
        />
      }
      content={
        <>
          <span>
            <Lang
              id='party_selection.no_valid_selection_second_part'
              params={[appMetadata?.title.nb]}
            />
          </span>
          <span>
            <Lang
              id='party_selection.no_valid_selection_third_part'
              params={[getAllowedParties()]}
            />
          </span>
          <br />
          <br />
          <span>
            <Lang
              id='instantiate.authorization_error_info_rights'
              params={[getHostname()]}
            />
          </span>
          <span>
            <Lang
              id='instantiate.authorization_error_info_customer_service'
              params={[
                <Lang
                  key={0}
                  id='general.customer_service_phone_number'
                />,
              ]}
            />
          </span>
        </>
      }
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

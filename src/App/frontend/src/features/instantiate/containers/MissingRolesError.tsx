import React from 'react';
import { Link } from 'react-router';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { returnUrlToAccessManagement, returnUrlToRolesAndRightsHelp } from 'src/utils/urls/urlHelper';

export function MissingRolesError() {
  const { langAsString } = useLanguage();
  const selectedParty = useSelectedParty();
  const accessManagementUrl = returnUrlToAccessManagement();
  const rolesAndRightsHelpUrl = returnUrlToRolesAndRightsHelp();

  return (
    <InstantiationErrorPage
      title={<Lang id='instantiate.authorization_error_main_title' />}
      content={
        <>
          <span>
            <Lang
              id='instantiate.authorization_error_rights'
              params={[selectedParty?.name]}
            />{' '}
            (
            <Link to='/party-selection/'>
              <Lang id='party_selection.change_party' />
            </Link>
            ).
          </span>
          <br />
          <br />
          <span>
            <Lang id='instantiate.authorization_error_ask' />
          </span>
          <br />
          {accessManagementUrl && (
            <span>
              <Lang
                id='instantiate.authorization_error_check_rights'
                params={[accessManagementUrl]}
              />
            </span>
          )}
          <br />
          <br />
          {rolesAndRightsHelpUrl && (
            <span>
              <Lang
                id='instantiate.authorization_error_info_rights'
                params={[rolesAndRightsHelpUrl]}
              />
            </span>
          )}
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

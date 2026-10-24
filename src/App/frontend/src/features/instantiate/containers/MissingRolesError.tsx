import React from 'react';
import { Link } from 'react-router';

import { platformLinkHref } from 'src/components/PlatformLink/PlatformLink';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSelectedParty } from 'src/features/party/PartiesProvider';

export function MissingRolesError() {
  const { langAsString } = useLanguage();
  const selectedParty = useSelectedParty();
  const accessManagementUrl = platformLinkHref('AccessManagementUrl');
  const rolesAndRightsHelpUrl = platformLinkHref('RolesAndRightsHelpUrl');

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
          <span>
            <Lang
              id='instantiate.authorization_error_check_rights'
              params={[accessManagementUrl]}
            />
          </span>
          <br />
          <br />
          <span>
            <Lang
              id='instantiate.authorization_error_info_rights'
              params={[rolesAndRightsHelpUrl]}
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

import React from 'react';
import { Link } from 'react-router-dom';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { getHostname } from 'src/utils/urls/appUrlHelper';

export function MissingRolesError() {
  const { langAsString } = useLanguage();
  const selectedParty = useSelectedParty();

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
              params={[getHostname()]}
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

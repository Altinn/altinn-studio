import React from 'react';
import { Link } from 'react-router-dom';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { getHostname } from 'src/utils/urls/appUrlHelper';

export function MissingRolesError() {
  const { lang, langAsString } = useLanguage();
  const selectedParty = useAppSelector((state) => state.party.selectedParty);

  function getErrorRights() {
    return lang('instantiate.authorization_error_rights', [selectedParty?.name]);
  }

  function getCustomerService() {
    return lang('instantiate.authorization_error_info_customer_service', [
      langAsString('general.customer_service_phone_number'),
    ]);
  }

  function getCheckRights(hostName: string) {
    return lang('instantiate.authorization_error_check_rights', [hostName]);
  }

  function getErrorInfoRights(hostName: string) {
    return lang('instantiate.authorization_error_info_rights', [hostName]);
  }

  function createErrorContent() {
    const hostName = getHostname();

    const errorRights = getErrorRights();
    const errorChangeParty = <Link to='/partyselection'>{lang('party_selection.change_party')}</Link>;
    const errorAsk = lang('instantiate.authorization_error_ask');
    const errorCheckRights = getCheckRights(hostName);
    const errorMoreInfo = getErrorInfoRights(hostName);
    const errorCustomerService = getCustomerService();

    return (
      <>
        <span>
          {errorRights} ({errorChangeParty}).{' '}
        </span>
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
      title={lang('instantiate.authorization_error_main_title')}
      content={createErrorContent()}
      statusCode={`${langAsString('party_selection.error_caption_prefix')} 403`}
    />
  );
}

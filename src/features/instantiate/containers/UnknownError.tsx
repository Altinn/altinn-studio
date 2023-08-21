import React from 'react';
import { useDispatch } from 'react-redux';

import { Button } from '@digdir/design-system-react';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { useIsDev } from 'src/hooks/useIsDev';
import { useLanguage } from 'src/hooks/useLanguage';

export function UnknownError() {
  const isDev = useIsDev();
  const { lang, langAsString } = useLanguage();
  const dispatch = useDispatch();

  function openLog() {
    dispatch(DevToolsActions.open());
    dispatch(DevToolsActions.setActiveTab({ tabName: DevToolsTab.Logs }));
  }

  const createUnknownErrorContent = (): JSX.Element => {
    const customerSupport = lang('instantiate.unknown_error_customer_support', [
      langAsString('general.customer_service_phone_number'),
    ]);

    return (
      <>
        {lang('instantiate.unknown_error_text')}
        <br />
        <br />
        {customerSupport}
        {isDev && (
          <>
            <br />
            <br />
            Sjekk loggen for mer informasjon.
            <br />
            <br />
            <Button
              size='small'
              onClick={openLog}
            >
              Vis logg
            </Button>
          </>
        )}
      </>
    );
  };

  return (
    <InstantiationErrorPage
      title={lang('instantiate.unknown_error_title')}
      content={createUnknownErrorContent()}
      statusCode={langAsString('instantiate.unknown_error_status')}
    />
  );
}

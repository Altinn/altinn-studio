import React from 'react';
import { useDispatch } from 'react-redux';

import { Button } from '@digdir/design-system-react';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useIsDev } from 'src/hooks/useIsDev';

export function UnknownError() {
  const isDev = useIsDev();
  const dispatch = useDispatch();

  function openLog() {
    dispatch(DevToolsActions.open());
    dispatch(DevToolsActions.setActiveTab({ tabName: DevToolsTab.Logs }));
  }

  return (
    <InstantiationErrorPage
      title={<Lang id='instantiate.unknown_error_title' />}
      statusCode={<Lang id='instantiate.unknown_error_status' />}
      content={
        <>
          <Lang id='instantiate.unknown_error_text' />
          <br />
          <br />
          <Lang
            id='instantiate.unknown_error_customer_support'
            params={[
              <Lang
                key={0}
                id='general.customer_service_phone_number'
              />,
            ]}
          />
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
      }
    />
  );
}

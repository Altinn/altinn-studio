import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';
import { useIsDev } from 'src/hooks/useIsDev';
import type { InvalidSubformLayoutException } from 'src/features/formData/InvalidSubformLayoutException';

export function InvalidSubformLayoutError({ error }: { error: InvalidSubformLayoutException }) {
  const isDev = useIsDev();
  const open = useDevToolsStore((s) => s.actions.open);
  const setActiveTab = useDevToolsStore((s) => s.actions.setActiveTab);

  function openLog() {
    open();
    setActiveTab(DevToolsTab.Logs);
  }

  return (
    <InstantiationErrorPage
      title={<Lang id='config_error.layoutset_error' />}
      statusCode={<Lang id='config_error.layoutset_error' />}
      content={
        <>
          <Lang
            id='config_error.layoutset_subform_config_error'
            params={[error.id]}
          />
          <br />
          <br />
          <Lang
            id='config_error.layoutset_subform_config_error_customer_support'
            params={[
              <Lang
                key={0}
                id='general.customer_service_phone_number'
              />,
              <Lang
                key={1}
                id='general.customer_service_email'
              />,
              <Lang
                key={2}
                id='general.customer_service_slack'
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

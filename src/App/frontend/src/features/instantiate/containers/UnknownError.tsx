import React from 'react';

import { Button } from '@app/form-component';
import { type AxiosError } from 'axios';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import styles from 'src/features/instantiate/containers/UnknownError.module.css';
import { UnknownErrorDetails } from 'src/features/instantiate/containers/UnknownErrorDetails';
import { Lang } from 'src/features/language/Lang';
import { isDev } from 'src/utils/isDev';

interface Props {
  error: Error | AxiosError;
}

export function UnknownError({ error }: Props) {
  const open = useDevToolsStore((s) => s.actions.open);
  const setActiveTab = useDevToolsStore((s) => s.actions.setActiveTab);

  function openLog() {
    open();
    setActiveTab(DevToolsTab.Logs);
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

          <UnknownErrorDetails
            error={error}
            className={styles.errorDetails}
          />

          {isDev() && (
            <>
              <br />
              <br />
              Sjekk loggen for mer informasjon.
              <br />
              <br />
              <Button onClick={openLog}>Vis logg</Button>
            </>
          )}
        </>
      }
    />
  );
}

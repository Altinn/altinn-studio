import React from 'react';

import { AltinnContentLoader } from 'src/app-components/loading/AltinnContentLoader/AltinnContentLoader';
import { useAppName } from 'src/core/texts/appTexts';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useInstanceOwnerParty, usePartiesAllowedToInstantiate } from 'src/features/party/PartiesProvider';
import { ConfirmPage } from 'src/features/process/confirm/containers/ConfirmPage';

export const Confirm = () => {
  const instance = useInstanceDataQuery().data;
  const parties = usePartiesAllowedToInstantiate();
  const instanceOwnerParty = useInstanceOwnerParty();

  const applicationMetadata = getApplicationMetadata();

  const missingRequirement = !instance ? 'instance' : !parties ? 'parties' : undefined;

  const appName = useAppName();
  return (
    <div id='confirmcontainer'>
      {missingRequirement ? (
        <AltinnContentLoader
          variant='receipt'
          width={705}
          height={561}
          reason={`confirm-missing-${missingRequirement}`}
        />
      ) : (
        <ConfirmPage
          applicationMetadata={applicationMetadata}
          instance={instance}
          instanceOwnerParty={instanceOwnerParty ?? undefined}
          appName={appName}
        />
      )}
    </div>
  );
};

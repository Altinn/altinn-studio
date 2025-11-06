import React from 'react';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { useAppName } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useInstanceOwnerParty, usePartiesAllowedToInstantiate } from 'src/features/party/PartiesProvider';
import { ConfirmPage } from 'src/features/process/confirm/containers/ConfirmPage';

export const Confirm = () => {
  const instance = useInstanceDataQuery().data;
  const parties = usePartiesAllowedToInstantiate();
  const instanceOwnerParty = useInstanceOwnerParty();

  const applicationMetadata = useApplicationMetadata();

  const missingRequirement = !instance ? 'instance' : !parties ? 'parties' : undefined;

  const appName = useAppName();
  return (
    <div id='confirmcontainer'>
      {missingRequirement ? (
        <AltinnContentLoader
          width={705}
          height={561}
          reason={`confirm-missing-${missingRequirement}`}
        >
          <AltinnContentIconReceipt />
        </AltinnContentLoader>
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

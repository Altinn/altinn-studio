import React from 'react';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { useAppName } from 'src/core/texts/appTexts';
import { ConfirmPage } from 'src/features/confirm/containers/ConfirmPage';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useParties } from 'src/features/party/PartiesProvider';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const Confirm = () => {
  const instance = useLaxInstanceData();
  const parties = useParties();
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const appName = useAppName();

  const missingRequirement = !instance ? 'instance' : !parties ? 'parties' : undefined;
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
          parties={parties}
          appName={appName}
        />
      )}
    </div>
  );
};

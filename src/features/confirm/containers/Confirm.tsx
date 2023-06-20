import React from 'react';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ConfirmPage } from 'src/features/confirm/containers/ConfirmPage';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { selectAppName } from 'src/selectors/language';

export const Confirm = () => {
  const { instanceId } = useInstanceIdParams();
  const dispatch = useAppDispatch();
  const instance = useAppSelector((state) => state.instanceData.instance);
  const parties = useAppSelector((state) => state.party.parties);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const appName = useAppSelector(selectAppName);

  React.useEffect(() => {
    dispatch(
      InstanceDataActions.get({
        instanceId,
      }),
    );
  }, [instanceId, dispatch]);
  const isLoading = !instance || !parties;
  return (
    <div id='confirmcontainer'>
      {isLoading ? (
        <AltinnContentLoader
          width={705}
          height={561}
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

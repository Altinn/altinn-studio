import React from 'react';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/common/hooks/useInstanceIdParams';
import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ConfirmPage } from 'src/features/confirm/containers/ConfirmPage';
import { selectAppName } from 'src/selectors/language';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';

export const Confirm = () => {
  const { instanceId } = useInstanceIdParams();
  const dispatch = useAppDispatch();
  const pageProps = {
    instance: useAppSelector((state) => state.instanceData.instance),
    parties: useAppSelector((state) => state.party.parties),
    applicationMetadata: useAppSelector((state) => state.applicationMetadata.applicationMetadata),
    language: useAppSelector((state) => state.language.language),
    appName: useAppSelector(selectAppName),
    textResources: useAppSelector((state) => state.textResources.resources),
  };
  React.useEffect(() => {
    dispatch(
      InstanceDataActions.get({
        instanceId,
      }),
    );
  }, [instanceId, dispatch]);
  const { instance, parties } = pageProps;
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
        <ConfirmPage {...pageProps} />
      )}
    </div>
  );
};

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { DataLoadingProvider } from 'src/core/contexts/dataLoadingContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { useCurrentPartyIsValid, useHasSelectedParty, useValidParties } from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import type { ShowTypes } from 'src/features/applicationMetadata/types';

const ShowOrInstantiate: React.FC<{ show: ShowTypes }> = ({ show }) => {
  if (show === 'select-instance') {
    return (
      <Navigate
        to='/instance-selection'
        replace={true}
      />
    );
  }

  if (show === 'new-instance') {
    return <InstantiateContainer />;
  }

  return <UnknownError />;
};

export const Entrypoint = () => {
  const {
    onEntry: { show },
    isStatelessApp: isStateless,
    promptForParty,
  } = useApplicationMetadata();
  const profile = useProfile();
  const validParties = useValidParties();
  const partyIsValid = useCurrentPartyIsValid();
  const userHasSelectedParty = useHasSelectedParty();

  if (isStateless) {
    return (
      <DataLoadingProvider>
        <FormProvider>
          <Outlet />
        </FormProvider>
      </DataLoadingProvider>
    );
  }

  if (!partyIsValid) {
    return (
      <Navigate
        to='/party-selection/403'
        replace={true}
      />
    );
  }

  if (!validParties?.length) {
    return <NoValidPartiesError />;
  }

  if (validParties.length === 1 || userHasSelectedParty) {
    return <ShowOrInstantiate show={show} />;
  }

  if (promptForParty === 'always') {
    return (
      <Navigate
        to='/party-selection/explained'
        replace={true}
      />
    );
  }

  if (promptForParty === 'never' || profile?.profileSettingPreference.doNotPromptForParty) {
    return <ShowOrInstantiate show={show} />;
  }

  return (
    <Navigate
      to='/party-selection/explained'
      replace={true}
    />
  );
};

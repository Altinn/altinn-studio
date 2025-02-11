import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { DataLoadingProvider } from 'src/core/contexts/dataLoadingContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import {
  useCurrentParty,
  useCurrentPartyIsValid,
  useHasSelectedParty,
  useValidParties,
} from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
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

  // If the show type is something else, it points to a layout set that describes a stateless form.
  return (
    <DataLoadingProvider>
      <FormProvider>
        <Outlet />
      </FormProvider>
    </DataLoadingProvider>
  );
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
  const allowAnonymous = useAllowAnonymousIs(true);
  const party = useCurrentParty();

  if (isStateless && allowAnonymous && !party) {
    // Anonymous stateless app. No need to log in and select party, but cannot create a new instance.
    // The regular stateless mode (where you have to log in) is handled in ShowOrInstantiate, after the party is
    // selected and valid.
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

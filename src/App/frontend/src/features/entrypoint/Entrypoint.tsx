import React from 'react';
import { Navigate, Outlet } from 'react-router';

import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
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
    <FormProvider>
      <Outlet />
    </FormProvider>
  );
};

export const Entrypoint = () => {
  const {
    onEntry: { show },
  } = getApplicationMetadata();
  const isStateless = useIsStateless();
  const allowAnonymous = useIsAllowAnonymous(true);
  const party = useSelectedParty();

  if (isStateless && allowAnonymous && !party) {
    // Anonymous stateless app. No need to log in and select party, but cannot create a new instance.
    // The regular stateless mode (where you have to log in) is handled in ShowOrInstantiate, after the party is
    // selected and valid.
    return (
      <FormProvider>
        <Outlet />
      </FormProvider>
    );
  }

  // Party selection redirects are now handled by the backend (HomeController).
  // If we reach this point, the backend has already validated that:
  // - The selected party is valid
  // - No party selection prompt is needed
  return <ShowOrInstantiate show={show} />;
};

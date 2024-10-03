import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { DataLoadingProvider } from 'src/core/contexts/dataLoadingContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import {
  useCurrentParty,
  useCurrentPartyIsValid,
  useHasSelectedParty,
  useValidParties,
} from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
import { PresentationType } from 'src/types';
import type { ShowTypes } from 'src/features/applicationMetadata/types';

const RenderStateless = () => (
  <DataLoadingProvider>
    <FormProvider>
      <Routes>
        <Route
          path=':pageKey'
          element={
            <PresentationComponent type={PresentationType.Stateless}>
              <Form />
            </PresentationComponent>
          }
        />
        <Route
          path='*'
          element={<FormFirstPage />}
        />
      </Routes>
    </FormProvider>
  </DataLoadingProvider>
);

const ShowOrInstantiate: React.FC<{ show: ShowTypes }> = ({ show }) => {
  const isStateless = useApplicationMetadata().isStatelessApp;

  if (isStateless) {
    return <RenderStateless />;
  }

  if (show === 'select-instance') {
    return (
      <Navigate
        to={'/instance-selection'}
        replace={true}
      />
    );
  }

  if (show === 'new-instance') {
    return <InstantiateContainer />;
  }

  window.logErrorOnce('Unknown applicationMetadata.onEntry type:', show);

  return <UnknownError />;
};

export const Entrypoint = () => {
  const {
    onEntry: { show },
    isStatelessApp: isStateless,
    promptForParty,
  } = useApplicationMetadata();
  const profile = useProfile();
  const party = useCurrentParty();
  const validParties = useValidParties();
  const partyIsValid = useCurrentPartyIsValid();
  const userHasSelectedParty = useHasSelectedParty();
  const allowAnonymous = useAllowAnonymousIs(true);

  if (isStateless && allowAnonymous && !party) {
    return <RenderStateless />;
  }

  if (!partyIsValid) {
    return (
      <Navigate
        to={'/party-selection/403'}
        replace={true}
      />
    );
  }

  if (!validParties?.length) {
    return <NoValidPartiesError />;
  }

  if (validParties?.length === 1) {
    return <ShowOrInstantiate show={show} />;
  }

  if (validParties?.length && validParties?.length > 1) {
    if (userHasSelectedParty) {
      return <ShowOrInstantiate show={show} />;
    }

    if (promptForParty === 'always') {
      return (
        <Navigate
          to={'/party-selection/explained'}
          replace={true}
        />
      );
    }

    if (promptForParty === 'never') {
      return <ShowOrInstantiate show={show} />;
    }

    if (profile?.profileSettingPreference.doNotPromptForParty) {
      return <ShowOrInstantiate show={show} />;
    }

    return (
      <Navigate
        to={'/party-selection/explained'}
        replace={true}
      />
    );
  }
  return <UnknownError />;
};

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { LayoutValidationProvider } from 'src/features/devtools/layoutValidation/useLayoutValidation';
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
import { useIsStatelessApp } from 'src/utils/useIsStatelessApp';
import type { ShowTypes } from 'src/features/applicationMetadata';

const RenderStateless = () => (
  <FormProvider>
    <LayoutValidationProvider>
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
    </LayoutValidationProvider>
  </FormProvider>
);

const ShowOrInstantiate: React.FC<{ show: ShowTypes }> = ({ show }) => {
  const isStateless = useIsStatelessApp();

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
  const applicationMetadata = useApplicationMetadata();
  const show: ShowTypes = applicationMetadata.onEntry?.show ?? 'new-instance';
  const validParties = useValidParties();
  const profile = useProfile();
  const partyIsValid = useCurrentPartyIsValid();
  const isStateless = useIsStatelessApp();
  const party = useCurrentParty();
  const allowAnonymous = useAllowAnonymousIs(true);
  const userHasSelectedParty = useHasSelectedParty();

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

    if (applicationMetadata.promptForParty === 'always') {
      return (
        <Navigate
          to={'/party-selection/explained'}
          replace={true}
        />
      );
    }

    if (applicationMetadata.promptForParty === 'never') {
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

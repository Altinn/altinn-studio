import React from 'react';
import { Navigate } from 'react-router-dom';

import type { AxiosError } from 'axios';

import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { Form } from 'src/components/form/Form';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { PresentationComponent } from 'src/components/wrappers/Presentation';
import { InstanceSelection } from 'src/features/instantiate/containers/InstanceSelection';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { PartyActions } from 'src/features/party/partySlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { usePartyValidationMutation } from 'src/hooks/mutations/usePartyValidationMutation';
import { useActiveInstancesQuery } from 'src/hooks/queries/useActiveInstancesQuery';
import { useAlwaysPromptForParty } from 'src/hooks/useAlwaysPromptForParty';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { PresentationType, ProcessTaskType } from 'src/types';
import { isStatelessApp } from 'src/utils/appMetadata';
import { checkIfAxiosError, HttpStatusCodes } from 'src/utils/network/networking';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ShowTypes } from 'src/features/applicationMetadata';

const titleKey = 'instantiate.starting';

type EntrypointProps = {
  allowAnonymous: boolean;
};
export function Entrypoint({ allowAnonymous }: EntrypointProps) {
  const [action, setAction] = React.useState<ShowTypes | null>(null);
  const selectedParty = useAppSelector((state) => state.party.selectedParty);

  const {
    data: partyValidation,
    mutate: validatePartyMutate,
    isError: hasPartyValidationError,
  } = usePartyValidationMutation();

  const shouldFetchActiveInstances = !!(
    action === 'select-instance' &&
    partyValidation?.valid &&
    selectedParty &&
    selectedParty.partyId
  );
  const { data: activeInstances, isError: hasActiveInstancesError } = useActiveInstancesQuery(
    selectedParty?.partyId || '',
    shouldFetchActiveInstances,
  );

  const applicationMetadata = useAppSelector((state) => state.applicationMetadata?.applicationMetadata);
  const statelessLoading = useAppSelector((state) => state.isLoading.stateless);
  const formDataError = useAppSelector((state) => state.formData.error);
  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);
  const alwaysPromptForParty = useAlwaysPromptForParty();

  const titleText = useAppSelector((state) => {
    const text = getTextFromAppOrDefault(
      titleKey,
      state.textResources.resources,
      state.language.language || {},
      [],
      true,
    );
    return text === titleKey ? '' : text;
  });

  const dispatch = useAppDispatch();

  const componentHasErrors = hasPartyValidationError || hasActiveInstancesError;

  const handleNewInstance = () => {
    setAction('new-instance');
  };

  React.useEffect(() => {
    if (!selectedParty) {
      return;
    }

    validatePartyMutate(selectedParty.partyId);
  }, [selectedParty, validatePartyMutate]);

  React.useEffect(() => {
    // If user comes back to entrypoint from an active instance we need to clear validation messages
    dispatch(ValidationActions.updateValidations({ validations: {} }));
  }, [dispatch]);

  React.useEffect(() => {
    if (applicationMetadata) {
      const onEntry = applicationMetadata.onEntry;
      if (!onEntry || onEntry.show === 'new-instance') {
        setAction('new-instance');
      } else {
        setAction(onEntry.show);
      }
    }
  }, [applicationMetadata]);

  if (componentHasErrors) {
    return <UnknownError />;
  }

  if (alwaysPromptForParty === true && !selectedParty) {
    dispatch(PartyActions.setAutoRedirect(true));
    return <Navigate to={'/partyselection/'} />;
  }

  if (partyValidation?.valid === false) {
    if (partyValidation.validParties?.length === 0) {
      return <NoValidPartiesError />;
    }
    return <Navigate to={`/partyselection/${HttpStatusCodes.Forbidden}`} />;
  }

  // error trying to fetch data, if missing rights we display relevant page
  if (checkIfAxiosError(formDataError)) {
    const axiosError = formDataError as AxiosError;
    if (axiosError.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }
  }

  // regular view with instance
  if (action === 'new-instance' && partyValidation?.valid) {
    return <InstantiateContainer />;
  }

  if (action === 'select-instance' && partyValidation?.valid && activeInstances !== undefined) {
    if (activeInstances?.length === 0) {
      // no existing instances exist, we start instantiation
      return <InstantiateContainer />;
    }
    if (activeInstances) {
      return (
        // let user decide if continuing on existing or starting new
        <PresentationComponent
          header={appName || ''}
          appOwner={appOwner}
          type={ProcessTaskType.Unknown}
        >
          <InstanceSelection
            instances={activeInstances}
            onNewInstance={handleNewInstance}
          />
        </PresentationComponent>
      );
    }
  }

  // stateless view
  if (isStatelessApp(applicationMetadata) && (allowAnonymous || partyValidation?.valid)) {
    if (statelessLoading === null) {
      dispatch(QueueActions.startInitialStatelessQueue());
    }
    if (statelessLoading === false) {
      return (
        <PresentationComponent
          header={appName || ''}
          appOwner={appOwner}
          type={PresentationType.Stateless}
        >
          <div>
            <Form />
          </div>
        </PresentationComponent>
      );
    }
  }

  return (
    <PresentationComponent
      header={titleText}
      type={ProcessTaskType.Unknown}
    >
      <AltinnContentLoader
        width='100%'
        height='400'
      >
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </PresentationComponent>
  );
}

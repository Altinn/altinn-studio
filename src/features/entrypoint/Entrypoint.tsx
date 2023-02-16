import React from 'react';
import { Navigate } from 'react-router-dom';

import type { AxiosError } from 'axios';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { Form } from 'src/features/form/containers/Form';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { InstanceSelection } from 'src/features/instantiate/containers/InstanceSelection';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { PresentationComponent } from 'src/shared/containers/Presentation';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { PresentationType, ProcessTaskType } from 'src/types';
import { isStatelessApp } from 'src/utils/appMetadata';
import { checkIfAxiosError, httpGet, httpPost, HttpStatusCodes } from 'src/utils/network/networking';
import { getActiveInstancesUrl, getPartyValidationUrl } from 'src/utils/urls/appUrlHelper';
import type { ShowTypes } from 'src/shared/resources/applicationMetadata';
import type { ISimpleInstance } from 'src/types';

export function Entrypoint({ allowAnonymous }: any) {
  const [action, setAction] = React.useState<ShowTypes | null>(null);
  const [partyValidation, setPartyValidation] = React.useState<any | null>(null);
  const [activeInstances, setActiveInstances] = React.useState<ISimpleInstance[] | null>(null);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata?.applicationMetadata);
  const selectedParty = useAppSelector((state) => state.party.selectedParty);
  const statelessLoading = useAppSelector((state) => state.isLoading.stateless);
  const formDataError = useAppSelector((state) => state.formData.error);
  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);
  const dispatch = useAppDispatch();

  const handleNewInstance = () => {
    setAction('new-instance');
  };

  React.useEffect(() => {
    if (action === 'select-instance' && partyValidation?.valid && selectedParty) {
      const fetchExistingInstances = async () => {
        try {
          const instances = await httpGet(getActiveInstancesUrl(selectedParty.partyId));
          setActiveInstances(instances || []);
        } catch (err) {
          console.error(err);
          throw new Error('Server did not return active instances');
        }
      };

      fetchExistingInstances();
    }
  }, [action, partyValidation, selectedParty]);

  React.useEffect(() => {
    if (selectedParty) {
      const validatatePartySelection = async () => {
        if (!selectedParty) {
          return;
        }
        try {
          const { data } = await httpPost(getPartyValidationUrl(selectedParty.partyId));
          setPartyValidation(data);
        } catch (err) {
          console.error(err);
          throw new Error('Server did not respond with party validation');
        }
      };

      validatatePartySelection();
    }
  }, [selectedParty]);

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

  if (action === 'select-instance' && partyValidation?.valid && activeInstances !== null) {
    if (activeInstances.length === 0) {
      // no existing instances exist, we start instantiation
      return <InstantiateContainer />;
    }
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
      header=''
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

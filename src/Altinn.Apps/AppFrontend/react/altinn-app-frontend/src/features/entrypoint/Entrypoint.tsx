/* eslint-disable import/no-named-as-default */
import { AltinnContentIconFormData, AltinnContentLoader } from 'altinn-shared/components';
import { AxiosError } from 'axios';
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from 'src/common/hooks';
import Presentation from 'src/shared/containers/Presentation';
import { ShowTypes } from 'src/shared/resources/applicationMetadata';
import { startInitialStatelessQueue } from 'src/shared/resources/queue/queueSlice';
import { ISimpleInstance, PresentationType, ProcessTaskType } from 'src/types';
import { isStatelessApp } from 'src/utils/appMetadata';
import { checkIfAxiosError, get, HttpStatusCodes, post } from 'src/utils/networking';
import { getActiveInstancesUrl, getPartyValidationUrl } from 'src/utils/urlHelper';
import Form from '../form/containers/Form';
import { updateValidations } from '../form/validation/validationSlice';
import Instantiate from '../instantiate/containers';
import InstanceSelection from '../instantiate/containers/InstanceSelection';
import MissingRolesError from '../instantiate/containers/MissingRolesError';
import NoValidPartiesError from '../instantiate/containers/NoValidPartiesError';

export default function Entrypoint() {
  const applicationMetadata = useAppSelector(state => state.applicationMetadata.applicationMetadata);
  const selectedParty = useAppSelector(state => state.party.selectedParty);
  const [action, setAction] = React.useState<ShowTypes>(null);
  const [partyValidation, setPartyValidation] = React.useState(null);
  const [activeInstances, setActiveInstances] = React.useState<ISimpleInstance[]>(null);
  const statelessLoading = useAppSelector(state => state.isLoading.stateless);
  const formDataError = useAppSelector(state => state.formData.error);
  const dispatch = useAppDispatch();

  const validatatePartySelection = async () => {
    if (!selectedParty) {
      return;
    }
    try {
      const { data } = await post(getPartyValidationUrl(selectedParty.partyId));
      setPartyValidation(data);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not respond with party validation');
    }
  };

  const fetchExistingInstances = async () => {
    try {
      const instances = await get(getActiveInstancesUrl(selectedParty.partyId));
      setActiveInstances(instances || []);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not return active instances');
    }
  };

  const handleNewInstance = () => {
    setAction('new-instance');
  };

  React.useEffect(() => {
    if (action === 'select-instance' && partyValidation?.valid) {
      fetchExistingInstances();
    }
  }, [action, partyValidation]);

  React.useEffect(() => {
    if (selectedParty) {
      validatatePartySelection();
    }
  }, [selectedParty]);

  React.useEffect(() => {
    // If user comes back to entrypoint from an active instance we need to clear validation messages
    dispatch(updateValidations({ validations: {} }));
  }, []);

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
      return (
        <NoValidPartiesError />
      );
    }
    return (
      <Redirect to={`/partyselection/${HttpStatusCodes.Forbidden}`} />
    );
  }

  // error trying to fetch data, if missing rights we display relevant page
  if (checkIfAxiosError(formDataError)) {
    const axiosError = formDataError as AxiosError;
    if (axiosError.response.status === HttpStatusCodes.Forbidden) {
      return (
        <MissingRolesError />
      );
    }
  }

  // regular view with instance
  if (action === 'new-instance' && partyValidation?.valid) {
    return <Instantiate />;
  }

  if (action === 'select-instance' && partyValidation?.valid && activeInstances !== null) {
    if (activeInstances.length === 0) {
      // no existing instances exist, we start instantiation
      return <Instantiate />;
    }
    return (
      // let user decide if continuing on existing or starting new
      <Presentation
        header={applicationMetadata?.title?.nb}
        type={ProcessTaskType.Unknown}
      >
        <InstanceSelection
          instances={activeInstances}
          onNewInstance={handleNewInstance}
        />
      </Presentation>
    );
  }

  // stateless view
  if (partyValidation?.valid && isStatelessApp(applicationMetadata)) {
    if (statelessLoading === null) {
      dispatch(startInitialStatelessQueue());
    }
    if (statelessLoading === false) {
      return (
        <Presentation
          header={applicationMetadata?.title?.nb}
          type={PresentationType.Stateless}
        >
          <div>
            <Form />
          </div>
        </Presentation>
      );
    }
  }

  return (
    <Presentation
      header=''
      type={ProcessTaskType.Unknown}
    >
      <AltinnContentLoader width='100%' height='400'>
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </Presentation>
  );
}

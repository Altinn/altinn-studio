/* eslint-disable import/no-named-as-default */
import { AltinnContentIconFormData, AltinnContentLoader } from 'altinn-shared/components';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import Presentation from 'src/shared/containers/Presentation';
import { startInitialStatelessQueue } from 'src/shared/resources/queue/queueSlice';
import { IRuntimeState, ISimpleInstance, PresentationType, ProcessTaskType } from 'src/types';
import { isStatelessApp } from 'src/utils/appMetadata';
import { HttpStatusCodes, post } from 'src/utils/networking';
import { getPartyValidationUrl } from 'src/utils/urlHelper';
import Form from '../form/containers/Form';
import Instantiate from '../instantiate/containers';
import InstanceSelection from '../instantiate/containers/InstanceSelection';
import NoValidPartiesError from '../instantiate/containers/NoValidPartiesError';

export default function Entrypoint() {
  const applicationMetadata = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);
  const [action, setAction] = React.useState<string>(null);
  const [partyValidation, setPartyValidation] = React.useState(null);
  const [activeInstances, setActiveInstances] = React.useState<ISimpleInstance[]>(null);
  const statelessLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.stateless);
  const dispatch = useDispatch();

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
      // const { data } = await get(getActiveInstancesUrl(selectedParty.partyId));'
      // TODO: remove this dummy api response when api has been fixed
      const data: ISimpleInstance[] = [
        {
          id: 'some-id', lastChanged: '28-01-1992', lastChangedBy: 'Steffen Ekeberg',
        },
        {
          id: 'some-id', lastChanged: '06-03-1974', lastChangedBy: 'Marius Ekeberg',
        },
        {
          id: 'some-id', lastChanged: '12-07-2004', lastChangedBy: 'Emma Ekeberg',
        },
        {
          id: 'some-id', lastChanged: '19-10-1998', lastChangedBy: 'Tine Ekeberg',
        },
      ];
      setActiveInstances(data);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not return active instances');
    }
  };

  const handleNewInstance = () => {
    setAction('new-instance');
  };

  React.useEffect(() => {
    if (action === 'instance-selection' && partyValidation?.valid) {
      fetchExistingInstances();
    }
  }, [action, partyValidation]);

  React.useEffect(() => {
    if (selectedParty) {
      validatatePartySelection();
    }
  }, [selectedParty]);

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

  // regular view with instance
  if (action === 'new-instance' && partyValidation?.valid) {
    return <Instantiate />;
  }

  if (action === 'instance-selection' && partyValidation?.valid && activeInstances !== null) {
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
  if (isStatelessApp(applicationMetadata) && partyValidation?.valid) {
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

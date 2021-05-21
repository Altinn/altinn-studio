/* eslint-disable import/no-named-as-default */
import { AltinnAppHeader, AltinnContentIconFormData, AltinnContentLoader, AltinnModal } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Presentation from 'src/shared/containers/Presentation';
import { startInitialStatelessQueue } from 'src/shared/resources/queue/queueSlice';
import { IRuntimeState, PresentationType } from 'src/types';
import Form from '../form/containers/Form';
import Instantiate from '../instantiate/containers';

export default function Entrypoint() {
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);
  const applicationMetadata = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const [action, setAction] = React.useState<string>(null);
  const statelessLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.stateless);
  const dispatch = useDispatch();

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

  if (action === 'new-instance') {
    return <Instantiate />;
  }

  if (action && action !== '') {
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
            <Form/>
          </div>
        </Presentation>
      );
    }
  }

  return (
    <>
      <AltinnAppHeader
        logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={AltinnAppTheme.altinnPalette.primary.blue}
        party={selectedParty}
        userParty={profile ? profile.party : {} as IParty}
      />
      <AltinnModal
        isOpen={true}
        onClose={null}
        hideBackdrop={true}
        hideCloseIcon={true}
      >
        <AltinnContentLoader width='100%' height='400'>
          <AltinnContentIconFormData/>
        </AltinnContentLoader>
      </AltinnModal>
    </>
  );
}

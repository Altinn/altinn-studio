import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import { AxiosError } from 'axios';
import * as React from 'react';
import ContentLoader from 'react-content-loader';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnAppHeader from '../../../../../shared/src/components/organisms/AltinnAppHeader';
import AltinnAppTheme from '../../../../../shared/src/theme/altinnAppTheme';
import { IParty } from '../../../../../shared/src/types';
import { checkIfAxiosError } from '../../../../../shared/src/utils/networking';
import { IAltinnWindow, IRuntimeState } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { HttpStatusCodes } from '../../../utils/networking';
import { post } from '../../../utils/networking';
import SubscriptionHookError from '../components/subscriptionHookError';
import InstantiationActions from '../instantiation/actions';
import { verifySubscriptionHook } from '../resources/verifySubscriptionHook';
import MissingRolesError from './MissingRolesError';
import NoValidPartiesError from './NoValidPartiesError';
import UnknownError from './UnknownError';

const styles = () => createStyles({
  modal: {
    boxShadow: null,
    MozBoxShadow: null,
    WebkitBoxShadow: null,
  },
  body: {
    padding: 0,
  },
});

export interface IPartyValidation {
  valid: boolean;
  message: string;
  validParties: IParty[];
}

export interface IServiceInfoProps extends WithStyles<typeof styles> {
  // intentionally left empty
}

function InstantiateContainer(props: IServiceInfoProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.blue);
  const { org, app } = window as Window as IAltinnWindow;

  const [subscriptionHookValid, setSubscriptionHookValid] = React.useState(null);
  const [partyValidation, setPartyValidation] = React.useState(null);
  const [instantiating, setInstantiating] = React.useState(false);

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);

  const createNewInstance = () => {
    if (!selectedParty) {
      return;
    }
    setInstantiating(true);
    InstantiationActions.instantiate(org, app);
  };

  const validatatePartySelection = async () => {
    if (!selectedParty) {
      return;
    }
    try {
      const { data } = await post(
        `${window.location.origin}/${org}/${app}/api/v1/parties/` +
        `validateInstantiation?partyId=${selectedParty.partyId}`,
      );
      setPartyValidation(data);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not respond with party validation');
    }
  };

  const validateSubscriptionHook = async () => {
    try {
      const result = await verifySubscriptionHook();
      setSubscriptionHookValid(result);
    } catch (err) {
      console.error(err);
      throw new Error('Subscription hook failed: ' + err.message);
    }
  };

  const renderModalAndLoader = (): JSX.Element => {
    const {classes} = props;
    return (
      <>
        <AltinnModal
          classes={classes}
          isOpen={true}
          onClose={null}
          hideBackdrop={true}
          hideCloseIcon={true}
          headerText={'Instansierer'}
        >
          <ContentLoader
            height={200}
          >
            <rect x='25' y='20' rx='0' ry='0' width='100' height='5' />
            <rect x='25' y='30' rx='0' ry='0' width='350' height='5' />
            <rect x='25' y='40' rx='0' ry='0' width='350' height='25' />

            <rect x='25' y='75' rx='0' ry='0' width='100' height='5' />
            <rect x='25' y='85' rx='0' ry='0' width='350' height='5' />
            <rect x='25' y='95' rx='0' ry='0' width='350' height='25' />

            <rect x='25' y='130' rx='0' ry='0' width='100' height='5' />
            <rect x='25' y='140' rx='0' ry='0' width='350' height='5' />
            <rect x='25' y='150' rx='0' ry='0' width='350' height='25' />
          </ContentLoader>
        </AltinnModal>
      </>
    );
  };

  React.useEffect(() => {
    validatatePartySelection();
  }, [selectedParty]);

  React.useEffect(() => {
    if (partyValidation !== null) {
      validateSubscriptionHook();
    }
  }, [partyValidation]);

  React.useEffect(() => {
    if (
      partyValidation !== null &&
      partyValidation.valid &&
      subscriptionHookValid !== null &&
      subscriptionHookValid &&
      !instantiating &&
      !instantiation.instanceId
    ) {
      createNewInstance();
    }
  }, [partyValidation, subscriptionHookValid, instantiating, selectedParty]);

  if (instantiation.error !== null && checkIfAxiosError(instantiation.error)) {
    const axiosError = instantiation.error as AxiosError;
    if (axiosError.response.status === HttpStatusCodes.Forbidden) {
      return (
        <MissingRolesError />
      );
    }

    return (
      <UnknownError />
    );
  }

  if (partyValidation !== null && !partyValidation.valid) {
    if (partyValidation.validParties !== null &&
      partyValidation.validParties.length === 0) {
      return (
        <NoValidPartiesError />
      );
    } else {
      return (
        <Redirect to={`/partyselection/${HttpStatusCodes.Forbidden}`}/>
      );
    }
  }

  if (instantiation.instanceId !== null) {
    return (
      <Redirect to={`/instance/${instantiation.instanceId}`} />
    );
  }

  return (
    <>
      <AltinnAppHeader
        logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={AltinnAppTheme.altinnPalette.primary.blue}
        party={selectedParty}
        userParty={profile ? profile.party : {} as IParty}
      />
      {(subscriptionHookValid === null || subscriptionHookValid === true) && renderModalAndLoader()}
      {subscriptionHookValid === false && <SubscriptionHookError textResources={textResources}/>}
    </>
  );
}

export default withStyles(styles)(InstantiateContainer);

import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import ContentLoader from 'react-content-loader';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnAppHeader from '../../../shared/components/altinnAppHeader';
import { IParty } from '../../../shared/resources/party';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { post } from '../../../utils/networking';
import SubscriptionHookError from '../components/subscriptionHookError';
import InstantiationActions from '../instantiation/actions';
import { verifySubscriptionHook } from '../resources/verifySubscriptionHook';

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
  const { org, service } = window as IAltinnWindow;

  const [subscriptionHookValid, setSubscriptionHookValid] = React.useState(null);
  const [partyValidation, setPartyValidation] = React.useState(null);
  const [instantiating, setInstantiating] = React.useState(false);

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);

  const createNewInstance = () => {
    setInstantiating(true);
    InstantiationActions.instantiate(org, service);
  };

  const validatatePartySelection = async () => {
    try {
      const { data } = await post(
        `${window.location.origin}/${org}/${service}/api/v1/parties/` +
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
    if (selectedParty !== null && !instantiating) {
      validatatePartySelection();
    }
  }, [selectedParty]);

  React.useEffect(() => {
    if (partyValidation !== null && !instantiating) {
      validateSubscriptionHook();
    }
  }, [partyValidation]);

  React.useEffect(() => {
    if (
      selectedParty !== null &&
      partyValidation !== null &&
      partyValidation.valid &&
      subscriptionHookValid !== null &&
      subscriptionHookValid &&
      !instantiating &&
      !instantiation.instanceId &&
      !instantiation.error
    ) {
      createNewInstance();
    }
  }, [selectedParty, partyValidation, subscriptionHookValid, instantiating]);

  if (partyValidation !== null && !partyValidation.valid) {
    if (partyValidation.validParties.length === 0) {
      return (
        <Redirect
          to={{
            pathname: '/error',
            state: {
              message: partyValidation.message,
            },
          }}
        />
      );
    } else {
      return (
        <Redirect
          to={{
            pathname: '/partyselection',
            state: {
              validParties: partyValidation.validParties,
            },
          }}
        />
      );
    }
  }
  if (instantiation.error !== null) {
    return (
      <Redirect
        to={{
          pathname: '/error',
          state: {
            message: instantiation.error,
          },
      }}
      />
    );
  }
  if (instantiation.instanceId !== null && instantiation.error === null) {
    return (
      <Redirect to={`/instance/${instantiation.instanceId}`} />
    );
  } else {
    return (
      <>
        <AltinnAppHeader profile={profile} language={language}/>
        {subscriptionHookValid === null && renderModalAndLoader()}
        {subscriptionHookValid === false && <SubscriptionHookError textResources={textResources}/>}
      </>
    );
  }
}

export default withStyles(styles)(InstantiateContainer);

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

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);

  const createNewInstance = () => {
    console.log('creating new instance');
    if (!instantiation.instanceId && !instantiation.error) {
      InstantiationActions.instantiate(org, service);
    } else {
      console.log(
        'Did not call InstantionationActions, since either have an id or an instantiation-error',
        instantiation,
      );
    }
  };

  const validatatePartySelection = async () => {
    try {
      if (!selectedParty) {
        console.log('validate party selection with no selected party doesnt work');
        return;
      }
      const { data } = await post(
        `${window.location.origin}/${org}/${service}/api/v1/parties/` +
        `validateInstantiation?partyId=${selectedParty.partyId}`,
      );
      console.log('result from validateInstantiation-api call', data);
      setPartyValidation(data);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not respond with party validation');
    }
  };

  const validateSubscriptionHook = async () => {
    try {
      console.log('validating subscription hook');
      const result = await verifySubscriptionHook();
      console.log('result from validate subscription hook api call', result);
      setSubscriptionHookValid(result);
    } catch (err) {
      console.error(err);
      throw new Error('Subscription hook failed: ' + err.message);
    }
  };

  const renderModalAndLoader = (): JSX.Element => {
    const {classes} = props;
    console.log('rendering modal and loader');
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
    console.log('instantiate.index.useEffect[selectedParty]');
    if (selectedParty !== null) {
      console.log('instantiate.index.useEffect[selectedParty].selectedParty not null', selectedParty);
      validatatePartySelection();
    }
  }, [selectedParty]);

  React.useEffect(() => {
    console.log('instantiate.index.useEffect[partyValidation]');
    if (partyValidation !== null) {
      console.log('instantiate.index.useEffect[selectedParty].partyValidation not null', partyValidation);
      validateSubscriptionHook();
    }
  }, [partyValidation]);

  React.useEffect(() => {
    console.log('instantiate.index.useEffect[subscriptionHookValid]');
    if (subscriptionHookValid !== null && subscriptionHookValid) {
      console.log('subscriptionHook is valid. Creating instance.');
      createNewInstance();
    }
  }, [subscriptionHookValid]);

  React.useEffect(() => {
    console.log('Console log everything');
    console.log('SelectedParty', selectedParty);
    console.log('PartyValidation', partyValidation);
    console.log('subscriptionHookValid', subscriptionHookValid);
  });

  if (partyValidation !== null && !partyValidation.valid) {
    if (partyValidation.validParties.length === 0) {
      console.log('redirecting to /error. No valid parties.');
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
      console.log('redirecting to /partySelection. Has other valid parties');
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
    console.log('redirection to /error. Instantiation-error', instantiation.error);
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
  if (instantiation.instanceId !== null && !instantiation.instantiating) {
    console.log(`redirecting to /instance/${instantiation.instanceId}`);
    return (
      <Redirect to={`/instance/${instantiation.instanceId}`} />
    );
  } else {
    console.log('rendering error for subscription hook');
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

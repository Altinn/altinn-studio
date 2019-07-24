import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import ContentLoader from 'react-content-loader';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnAppHeader from '../../../shared/components/altinnAppHeader';
import { IParty } from '../../../shared/resources/party';
import ProfileActions from '../../../shared/resources/profile/profileActions';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { post } from '../../../utils/networking';

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

function ServiceInfo(props) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.blue);
  const { org, service } = window as IAltinnWindow;
  const [instanceId, setInstanceId] = React.useState(null);
  const [partyValidation, setPartyValidation] = React.useState(null);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);

  const createNewInstance = async () => {
    try {
      const formData: FormData = new FormData();
      formData.append('PartyId', selectedParty.partyId.toString());
      formData.append('Org', org);
      formData.append('Service', service);
      const url = `${window.location.origin}/${org}/${service}/Instance/InstantiateApp`;
      const response = await post(url, null, formData);

      if (response.data.instanceId) {
        setInstanceId(response.data.instanceId);
        (window as IAltinnWindow).instanceId = response.data.instanceId;
      } else {
        throw new Error('Server did not respond with new instance');
      }
    } catch (err) {
      throw new Error('Server did not respond with new instance');
    }
  };

  const validatatePartySelection = async () => {
    try {
      if (!profile) {
        return;
      }
      const { data } = await post(
        `${window.location.origin}/${org}/${service}` +
        `/api/v1/parties/validateInstantiation?partyId=${selectedParty.partyId}`,
      );
      console.log(data);
      setPartyValidation(data);
    } catch (err) {
      throw new Error('Server did not respond with party validation');
    }
  };

  React.useEffect(() => {
    if (!profile) {
      ProfileActions.fetchProfile(`${window.location.origin}/${org}/${service}/api/v1/profile/user`);
    }
    if (!partyValidation) {
      validatatePartySelection();
    }
    if (!instanceId && profile !== null && partyValidation !== null) {
      createNewInstance();
    }
  }, [profile, instanceId, partyValidation]);

  if (!selectedParty) {
    return (
      <Redirect to={'/partyselection'}/>
    );
  }

  if (partyValidation !== null && !partyValidation.valid) {
    if (partyValidation.validParties.length > 0) {
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
    return (
      <Redirect to={'/partyselection'}/>
    );
  }
  if (instanceId) {
    return (
      <Redirect to={`/instance/${instanceId}`} />
    );
  } else {
    const { classes } = props;
    return (
      <>
      <AltinnAppHeader profile={profile} language={language}/>
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
  }
}

export default withStyles(styles)(ServiceInfo);

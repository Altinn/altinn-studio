import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import ContentLoader from 'react-content-loader';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import AltinnAppHeader from '../../../shared/components/altinnAppHeader';
import { get, post } from '../../../utils/networking';

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

function ServiceInfo(props) {
  const { org, service } = window as IAltinnWindow;
  const [reportee, setReportee] = React.useState(null);
  const [instanceId, setInstanceId] = React.useState(null);
  const [instantiationError, setInstantiationError] = React.useState(null);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);

  const fetchReportee = async () => {
    const url: string = `${window.location.origin}/${org}/${service}/api/v1/profile/user`;
    const fetchedReportee: any = await get(url);
    setReportee(fetchedReportee);
  };

  const createNewInstance = async () => {
    try {
      const formData: FormData = new FormData();
      formData.append('PartyId', reportee.partyId);
      formData.append('Org', org);
      formData.append('Service', service);
      const url = `${window.location.origin}/${org}/${service}/Instance/InstantiateApp`;
      const response = await post(url, null, formData);

      if (response.data.instanceId) {
        setInstanceId(response.data.instanceId);
      } else {
        setInstantiationError(new Error(
          'Server responded without instanceId',
        ));
      }
    } catch (err) {
      alert(err);
    }
  };

  React.useEffect(() => {
    if (!reportee) {
      fetchReportee();
    }
    if (!instanceId && reportee !== null && instantiationError === null) {
      createNewInstance();
    }
  }, [reportee, instanceId]);

  if (instanceId) {
    return (
      <Redirect to={`/instance/${reportee.partyId}/${instanceId}`} />
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

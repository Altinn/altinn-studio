import Grid from '@material-ui/core/Grid';
import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { IAltinnWindow } from 'src/types';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import { AltinnSpinner } from '../../../../../shared/src/components/AltinnSpinner';
import { get, post } from '../../../utils/networking';

const styles = () => createStyles({
  modal: {
    boxShadow: null,
    MozBoxShadow: null,
    WebkitBoxShadow: null,
  },
});

function ServiceInfo(props) {
  const [reportee, setReportee] = React.useState(null);
  const [instanceId, setInstanceId] = React.useState(null);

  const fetchReportee = async () => {
    const url: string = `${window.location.origin}/runtime/api/v1/profile/user`;
    const fetchedReportee: any = await get(url);
    setReportee(fetchedReportee);
  };

  const createNewInstance = async () => {
    try {
      const { org, service } = window as IAltinnWindow;
      const url = `${window.location.origin}/runtime/Instance/StartService`;
      const formData: FormData = new FormData();
      formData.append('ReporteeID', reportee.userId);
      formData.append('Org', org);
      formData.append('Service', service);
      const response = await post(url, null, formData);

      const responseUrl: string[] = response.request.responseURL.split('/');

      setInstanceId(responseUrl[(responseUrl.length - 2)]);
    } catch (err) {
      alert(err);
    }
  };

  React.useEffect(() => {
    if (!reportee) {
      fetchReportee();
    }
    if (!instanceId && reportee !== null) {
      createNewInstance();
    }
  }, [reportee, instanceId]);

  if (instanceId) {
    return (
      <Redirect to={`/instance/${instanceId}`} />
    );
  } else {
    const { classes } = props;
    return (
      <AltinnModal
        classes={classes}
        isOpen={true}
        onClose={null}
        hideBackdrop={true}
        hideCloseIcon={true}
        headerText={
          <>
            Instansierer
          </>
        }
      >
        <Grid
          container={true}
        >
          {`Vi instansierer tjenesten for deg...`} <br />
        </Grid>
      </AltinnModal>
    );
  }
}

export default withStyles(styles)(ServiceInfo);

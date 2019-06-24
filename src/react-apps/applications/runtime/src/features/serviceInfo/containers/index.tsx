import Grid from '@material-ui/core/Grid';
import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import { get } from '../../../utils/networking';
import Header from '../../header/containers';

const styles = () => createStyles({
  container: {

  },
});

function ServiceInfo(props: any) {
  const [reportee, setReportee] = React.useState(null);
  const { history } = props;

  const fetchReportee = async () => {
    let routePrefix: string = null;
    if (window.location.origin.includes('altinn.studio') || window.location.origin.includes('altinn3.no')) {
      routePrefix = '/runtime';
    }
    const url: string = `${window.location.origin}${routePrefix}/api/v1/profile/user`;
    const fetchedReportee: any = await get(url);
    setReportee(fetchedReportee);
  };

  React.useEffect(() => {
    if (!reportee) {
      fetchReportee();
    }
  }, []);

  const onClickInstantiate = () => {
    history.push('/instantiate');
  };

  const { classes } = props;
  return (
    <>
      <Header />
      <Grid
        container={true}
        classes={classes}
      >
        {`Hei${reportee ? ' ' + reportee.party.person.firstName : null}!`}<br />
        {`Du leverer skjema som `} <br />
        <AltinnButton
          onClickFunction={onClickInstantiate}
          btnText={'Start innsending'}
        />
      </Grid>
      {/*
      <div style={{ backgroundColor: '#1EAEF7', height: 'calc(100vh - 146px)' }}>
        <div className='container'>
          <div className='row'>
            <div className='col-xl-12'>
              <div className='a-modal-top'>
                <img
                  src='/designer/img/a-logo-blue.svg'
                  alt='Altinn logo'
                  className='a-logo a-modal-top-logo '
                />
                <div className='a-modal-top-user'>
                  <div
                    className='a-personSwitcher '
                    title={'form_filler.placeholder_user'}
                  >
                    <span className='a-personSwitcher-name'>
                      <span className='d-block' style={{ color: '#022F51' }}>
                        {'form_filler.placeholder_user'}
                      </span>
                      <span className='d-block' />
                    </span>
                    <i
                      className='fa fa-private-circle-big  a-personSwitcher-icon'
                      aria-hidden='true'
                      style={{ color: '#022F51' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div >
          <div className='row'>
            <div className='col-xl-10 offset-xl-1 a-p-static'>
              <div className='a-modal-navbar'>
                <button type='button' className='a-modal-back a-js-tabable-popover' aria-label='Tilbake'>
                  <span className='ai-stack'>
                    <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
                    <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
                  </span>
                </button>
              </div>
              <div className='a-modal-content-target'>
                <div className='a-page a-current-page'>
                  <div className='modalPage'>
                    <div className='modal-content'>
                      <div className='modal-header a-modal-header'>
                        <div className='a-iconText a-iconText-background a-iconText-large'>
                          <div className='a-iconText-icon'>
                            <i className='fa fa-corp a-icon' aria-hidden='true' />
                          </div>
                          <h1 className='a-iconText-text mb-0'>
                            <span className='a-iconText-text-large'>Info</span>
                          </h1>
                        </div>
                      </div>
                      <div className='modal-body a-modal-body'>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      */}
    </>
  );
}

export default withStyles(styles)(ServiceInfo);

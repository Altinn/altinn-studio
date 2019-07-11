import Grid from '@material-ui/core/Grid';
import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect, useSelector } from 'react-redux';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
// import { altinnAppsImgLogoBlueSvgUrl } from '../../../../../shared/src/utils/urlHelper';
import Header from '../../../shared/components/altinnAppHeader';
import LanguageActions from '../../../shared/resources/language/languageActions';
import { IProfile } from '../../../shared/resources/profile';
import ProfileActions from '../../../shared/resources/profile/profileActions';
import { IAltinnWindow, IRuntimeState } from '../../../types';

export interface IServiceInfoProvidedProps {
  classes: any;
  history: any;
}

export interface IServiceInfoProps extends IServiceInfoProvidedProps {
  profile: IProfile;
}

const styles = () => createStyles({
  container: {

  },
});

function ServiceInfoContainer(props: IServiceInfoProps) {
  const { history } = props;
  const { org, service } = window as IAltinnWindow;

  const language = useSelector((state: IRuntimeState) => state.language.language);

  React.useEffect(() => {
    ProfileActions.fetchProfile(
      `${window.location.origin}/${org}/${service}/api/v1/profile/user`,
    );
    LanguageActions.fetchLanguage(
      `${window.location.origin}/${org}/${service}/api/Language/GetLanguageAsJSON`,
      'nb',
    );
  }, []);

  const onClickInstantiate = () => {
    history.push('/instantiate');
  };

  const { classes } = props;
  return (
    <>
      <Header language={language} profile={props.profile}/>
      <Grid
        container={true}
        classes={classes}
        className='container'
      >
        {`Hei ${props.profile ? props.profile.party.person.firstName : null}!`}<br />
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
                  src={altinnAppsImgLogoBlueSvgUrl}
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
const mapStateToProps: (
  state: IRuntimeState,
  props: IServiceInfoProvidedProps,
) => IServiceInfoProps = (state: IRuntimeState, props: IServiceInfoProvidedProps) => ({
  classes: props.classes,
  history: props.history,
  profile: state.profile.profile,
});

export const ServiceInfo =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(ServiceInfoContainer));

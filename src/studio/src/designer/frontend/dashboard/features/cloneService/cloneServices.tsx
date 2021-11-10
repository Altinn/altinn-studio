/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
import { Typography } from '@material-ui/core';
import { createTheme, createStyles, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RouteChildrenProps, withRouter } from 'react-router';
import AltinnBreadcrumb from 'app-shared/components/AltinnBreadcrumb';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { get } from 'app-shared/utils/networking';

export interface ICloneServiceComponentProvidedProps {
  classes: any;
}

export interface ICloneServiceComponentProps extends ICloneServiceComponentProvidedProps {
  language: any;
  services: any;
}

export interface ICloneServiceComponentState {
  lastChangedBy: string;
  isLoading: boolean;
}
const theme = createTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    marginLeft: 120,
    marginTop: '50px',
    [theme.breakpoints.down('md')]: {
      marginLeft: '50px',
      marginRight: '50px',
    },
  },
  avatar: {
    maxHeight: '2em',
  },
  ownerStyle: {
    fontSize: '16px',
    marginTop: '60px',
  },
  serviceHeader: {
    maxWidth: 840,
    overflowWrap: 'break-word' as 'break-word',
  },
  iconStyling: {
    fontSize: '36px',
  },
  metadataStyle: {
    marginTop: '50px',
  },

  descriptionStyle: {
    marginTop: '36px',
  },
  descriptionHeader: {
    fontSize: '20px',
  },
  btnStyle: {
    marginTop: '100px',
  },
  editService: {
    marginRight: '24px',
  },
  breadCrumb: {
    marginTop: 24,
    marginLeft: 66,
    fontSize: 16,
    overflowWrap: 'break-word' as 'break-word',
    [theme.breakpoints.down('md')]: {
      marginLeft: '50px',
      marginRight: '50px',
    },
  },
  fontSize_16: {
    fontSize: 16,
  },
});

// eslint-disable-next-line max-len
export class CloneServiceComponent extends React.Component<ICloneServiceComponentProps & RouteChildrenProps, ICloneServiceComponentState> {
  // eslint-disable-next-line react/state-in-constructor
  public state: ICloneServiceComponentState = {
    lastChangedBy: '',
    isLoading: false,
  };

  public componentDidMount() {
    this.componentMounted = true;
    const { location } = window as Window;
    const { org, serviceName } = (this.props.match.params as any);
    // eslint-disable-next-line max-len
    const url = `${location.origin}/designerapi/Repository/Branch?org=${org}&repository=${serviceName}&branch=master`;
    get(url).then((result: any) => {
      if (result && this.componentMounted) {
        this.setState({
          lastChangedBy: result.commit.author.name,
        });
      }
    });
  }

  public componentWillUnmount() {
    this.componentMounted = false;
  }

  public getCurrentRepositoryInfo = () => {
    const { org, serviceName } = (this.props.match.params as any);
    // eslint-disable-next-line consistent-return
    const returnService = this.props.services.filter((service: any) => {
      // eslint-disable-next-line max-len
      if (service.full_name === `${org}/${serviceName}`) {
        return service;
      }
    });

    return returnService.length === 1 ? returnService[0] : null;
  };

  public redirectToCode = () => {
    const repoInfo = this.getCurrentRepositoryInfo();
    window.location.assign(`/repos/${repoInfo.full_name}`);
  };

  public componentMounted = false;

  public cloneAndEditService = () => {
    const altinnWindow = window as Window as IAltinnWindow;
    const { location } = altinnWindow;
    const repoInfo = this.getCurrentRepositoryInfo();
    const { org, serviceName } = (this.props.match.params as any);
    if (repoInfo && repoInfo.is_cloned_to_local) {
      // eslint-disable-next-line max-len
      window.location.assign(`${location.origin}/designer/${org}/${serviceName}`);
    }

    // eslint-disable-next-line max-len
    const url = `${location.origin}/designerapi/Repository/CloneRemoteRepository?org=${org}&repository=${serviceName}`;
    this.setState({
      isLoading: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get(url).then((result: any) => {
      if (this.componentMounted) {
        // eslint-disable-next-line max-len
        window.location.assign(`${location.origin}/designer/${org}/${serviceName}`);
      }
    });
  };

  public render() {
    const { classes } = this.props;
    // eslint-disable-next-line max-len
    const repoInfo = this.getCurrentRepositoryInfo();
    return (
      <>
        <AltinnBreadcrumb
          className={classes.breadCrumb}
          firstLink={`${window.location.origin}/`}
          firstLinkTxt={getLanguageFromKey('dashboard.main_header', this.props.language)}
          secondLinkTxt={(this.props.match.params as any).serviceName}
        />
        {repoInfo &&
          <div className={classes.mainStyle}>
            <Typography
              component='h1' variant='h1'
              gutterBottom={true} className={classes.serviceHeader}
            >
              {`${repoInfo.owner.login} / ${repoInfo.name}`}
            </Typography>
            <div>
              <Typography className={classes.ownerStyle}>
                <img
                  src={repoInfo.owner.avatar_url}
                  className={classNames(classes.avatar)}
                  alt=''
                /> {repoInfo.owner.full_name || repoInfo.owner.login}
              </Typography>
            </div>
            <div className={classes.metadataStyle}>
              <Typography className={classes.fontSize_16}>
                {getLanguageFromKey('dashboard.created_time', this.props.language)} {formatNameAndDate('', repoInfo.created_at)}
              </Typography>
              <Typography className={classes.fontSize_16}>
                {getLanguageFromKey('dashboard.last_changed_service', this.props.language)} {formatNameAndDate(this.state.lastChangedBy, repoInfo.updated_at)}
              </Typography>
            </div>
            <div className={classes.descriptionStyle}>
              <Typography className={classes.descriptionHeader}>
                {getLanguageFromKey('general.service_description_header', this.props.language)}
              </Typography>
              <Typography className={classes.fontSize_16}>
                {repoInfo.description ||
                  getLanguageFromKey('dashboard.no_description', this.props.language)}
              </Typography>
            </div>
            <div className={classes.btnStyle}>
              {this.state.isLoading ?
                <AltinnSpinner
                  spinnerText={getLanguageFromKey('dashboard.loading_service', this.props.language)}
                />
                :
                <>
                  <AltinnButton
                    id='editService'
                    btnText={getLanguageFromKey('dashboard.edit_service', this.props.language)}
                    className={classes.editService}
                    onClickFunction={this.cloneAndEditService}
                  />
                  <AltinnButton
                    id='seeSourceCode'
                    btnText={getLanguageFromKey('dashboard.see_source_code', this.props.language)}
                    onClickFunction={this.redirectToCode}
                  />
                </>
              }
            </div>
          </div>
        }
      </>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: ICloneServiceComponentProvidedProps,
): ICloneServiceComponentProps => {
  return {
    language: state.language.language,
    services: state.dashboard.services,
    classes: props.classes,
  };
};

export const CloneService = withRouter(
  withStyles(styles)(connect(mapStateToProps)(CloneServiceComponent)),
);

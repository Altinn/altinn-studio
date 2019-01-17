import { Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import AltinnBreadcrumb from '../../../../shared/src/components/AltinnBreadcrumb';
import AltinnButton from '../../../../shared/src/components/AltinnButton';
import AltinnSpinner from '../../../../shared/src/components/AltinnSpinner';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { get } from '../../../../shared/src/utils/networking';

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
const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    marginLeft: 120,
    marginTop: '50px',
    [theme.breakpoints.down('md')]: {
      marginLeft: '50px',
      marginRight: '50px',
    },
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

// tslint:disable-next-line:max-line-length
export class CloneServiceComponent extends React.Component<ICloneServiceComponentProps & RouteChildrenProps, ICloneServiceComponentState> {
  public _isMounted = false;
  public state: ICloneServiceComponentState = {
    lastChangedBy: '',
    isLoading: false,
  };

  public componentDidMount() {
    this._isMounted = true;
    const altinnWindow: any = window as any;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Branch?owner=${(this.props.match.params as any).org}&repository=${(this.props.match.params as any).serviceName}&branch=master`;
    get(url).then((result: any) => {
      if (result && this._isMounted) {
        this.setState({
          lastChangedBy: result.commit.author.name,
        });
      }
    });
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }

  public formatNameAndDate(name: string, date: string) {
    const returnDate = date ? moment(new Date(date)).format('DD.MM.YYYY HH:mm') : date;
    return name ? `${name} ${returnDate}` : returnDate;
  }

  public redirectToCode = () => {
    // tslint:disable-next-line:max-line-length
    const repoInfo = this.getCurrentRepositoryInfo();
    window.location.href = `/${repoInfo.full_name}`;
  }

  public getCurrentRepositoryInfo = () => {
    const returnService = this.props.services.filter((service: any) => {
      // tslint:disable-next-line:max-line-length
      if (service.full_name === `${(this.props.match.params as any).org}/${(this.props.match.params as any).serviceName}`) {
        return service;
      }
    });
    return returnService.length === 1 ? returnService[0] : null;
  }

  public cloneAndEditService = () => {
    const altinnWindow: any = window as any;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/CloneRemoteRepository?owner=${(this.props.match.params as any).org}&repository=${(this.props.match.params as any).serviceName}`;
    this.setState({
      isLoading: true,
    });
    get(url).then((result: any) => {
      // tslint:disable-next-line:max-line-length
      window.location.href = `${altinnWindow.location.origin}/designer/${(this.props.match.params as any).org}/${(this.props.match.params as any).serviceName}`;
    });
  }

  public render() {
    const { classes } = this.props;
    // tslint:disable-next-line:max-line-length
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
            <Typography component='h1' variant='h1' gutterBottom={true} className={classes.serviceHeader}>
              {repoInfo.name}
            </Typography>
            <div>
              <Typography className={classes.ownerStyle}>
                <i
                  className={classNames(
                    classes.iconStyling,
                    { ['ai ai-corp']: repoInfo.owner.UserType === 2 },
                    { ['ai ai-private']: repoInfo.owner.UserType !== 2 })}
                  aria-hidden='true'
                /> {repoInfo.owner.full_name || repoInfo.owner.login}
              </Typography>
            </div>
            <div className={classes.metadataStyle}>
              <Typography className={classes.fontSize_16}>
                {/* tslint:disable-next-line:max-line-length */}
                {getLanguageFromKey('dashboard.created_time', this.props.language)} {this.formatNameAndDate('', repoInfo.created_at)}
              </Typography>
              <Typography className={classes.fontSize_16}>
                {/* tslint:disable-next-line:max-line-length */}
                {getLanguageFromKey('dashboard.last_changed_by', this.props.language)} {this.formatNameAndDate(this.state.lastChangedBy, repoInfo.updated_at)}
              </Typography>
            </div>
            <div className={classes.descriptionStyle}>
              <Typography className={classes.descriptionHeader}>
                {getLanguageFromKey('dashboard.description_header', this.props.language)}
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
                    btnText={getLanguageFromKey('dashboard.edit_service', this.props.language)}
                    className={classes.editService}
                    onClickFunction={this.cloneAndEditService}
                  />
                  <AltinnButton
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
  withStyles(styles)
    (connect(mapStateToProps)(CloneServiceComponent)));

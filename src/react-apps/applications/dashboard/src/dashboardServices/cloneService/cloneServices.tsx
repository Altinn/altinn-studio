import { Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import { compose } from 'redux';
import AltinnBreadcrumb from '../../../../shared/src/components/AltinnBreadcrumb';
import AltinnButton from '../../../../shared/src/components/AltinnButton';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { get } from '../../../../shared/src/utils/networking';

export interface ICloneServiceComponentProvidedProps {
  classes: any;
}

export interface ICloneServiceComponentProps extends ICloneServiceComponentProvidedProps, RouteChildrenProps {
  language: any;
  repositoryInfo: any;
}

export interface ICloneServiceComponentState {
  createdBy: string;
}

const styles = {
  mainStyle: {
    marginLeft: 120,
    marginTop: '50px',
  },
  ownerStyle: {
    fontSize: '16px',
    marginTop: '60px',
  },
  iconStyling: {
    fontSize: '36px',
  },
  metadataStyle: {
    fontSize: '16px',
    marginTop: '50px',
  },

  descriptionStyle: {
    marginTop: '36px',
    fontSize: '16px',
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
  },
  backToDashboard: {
    fontWeight: 600,
  },
};

class CloneServiceComponent extends React.Component<ICloneServiceComponentProps, ICloneServiceComponentState> {
  public _isMounted = false;
  public state: ICloneServiceComponentState = {
    createdBy: '',
  };

  public componentDidMount() {
    this._isMounted = true;
    const altinnWindow: any = window as any;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Branch?owner=${(this.props.match.params as any).org}&repository=${(this.props.match.params as any).serviceName}&branch=master`;
    get(url).then((result: any) => {
      console.log(result);
      if (result && this._isMounted) {
        this.setState({
          createdBy: result.commit.author.name,
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
    window.location.href = `/${this.props.repositoryInfo.full_name}`;
  }

  public cloneAndEditService = () => {
    const altinnWindow: any = window as any;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/CloneRemoteRepository?owner=${(this.props.match.params as any).org}&repository=${(this.props.match.params as any).serviceName}`;
    get(url).then((result: any) => {
      // tslint:disable-next-line:max-line-length
      window.location.href = `${altinnWindow.location.origin}/designer/${(this.props.match.params as any).org}/${(this.props.match.params as any).serviceName}`;
    });
  }

  public render() {
    const { classes } = this.props;
    return (
      <>
        <AltinnBreadcrumb
          className={classes.breadCrumb}
          firstLink={`${window.location.origin}/`}
          firstLinkTxt={getLanguageFromKey('dashboard.main_header', this.props.language)}
          secondLinkTxt={(this.props.match.params as any).serviceName}
        />
        {this.props.repositoryInfo &&
          <div className={classes.mainStyle}>
            <Typography component='h1' variant='h1' gutterBottom={true}>
              {this.props.repositoryInfo.name}
            </Typography>
            <div>
              <Typography className={classes.ownerStyle}>
                <i
                  className={classNames(
                    classes.iconStyling,
                    { ['ai ai-corp']: this.props.repositoryInfo.owner.UserType === 2 },
                    { ['ai ai-private']: this.props.repositoryInfo.owner.UserType !== 2 })}
                  aria-hidden='true'
                /> {this.props.repositoryInfo.owner.full_name || this.props.repositoryInfo.owner.login}
              </Typography>
            </div>
            <div className={classes.metadataStyle}>
              <Typography>
                {/* tslint:disable-next-line:max-line-length */}
                {getLanguageFromKey('dashboard.created_time', this.props.language)} {this.formatNameAndDate(this.state.createdBy, this.props.repositoryInfo.created_at)}
              </Typography>
              <Typography>
                {/* tslint:disable-next-line:max-line-length */}
                {getLanguageFromKey('dashboard.last_changed_by', this.props.language)} {this.formatNameAndDate('', this.props.repositoryInfo.updated_at)}
              </Typography>
            </div>
            <div className={classes.descriptionStyle}>
              <Typography className={classes.descriptionHeader}>
                {getLanguageFromKey('dashboard.description_header', this.props.language)}
              </Typography>
              <Typography>
                {this.props.repositoryInfo.description}
              </Typography>
            </div>
            <div className={classes.btnStyle}>
              <AltinnButton
                btnText={getLanguageFromKey('dashboard.edit_service', this.props.language)}
                className={classes.editService}
                onClickFunction={this.cloneAndEditService}
              />
              <AltinnButton
                btnText={getLanguageFromKey('dashboard.see_source_code', this.props.language)}
                onClickFunction={this.redirectToCode}
              />
            </div>
          </div>
        }
      </>
    );
  }
}

const getCurrentRepositoryInfo = (services: any, org: string, servicename: string) => {
  const returnService = services.filter((service: any) => {
    if (service.full_name === `${org}/${servicename}`) {
      return service;
    }
  });
  return returnService.length === 1 ? returnService[0] : null;
};

const mapStateToProps = (
  state: IDashboardAppState,
  props: ICloneServiceComponentProps,
): any => {
  return {
    classes: props.classes,
    language: state.language.language,
    // tslint:disable-next-line:max-line-length
    repositoryInfo: getCurrentRepositoryInfo(state.dashboard.services, (props.match.params as any).org, (props.match.params as any).serviceName),
  };
};

export const CloneService = compose(
  withStyles(styles),
  withRouter,
  connect(mapStateToProps),
)(CloneServiceComponent);

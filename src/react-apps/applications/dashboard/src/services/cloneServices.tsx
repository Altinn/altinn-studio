import { Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps, withRouter } from 'react-router';
import { compose } from 'redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { get } from '../../../shared/src/utils/networking';
import AltinnButton from '../../../shared/src/components/AltinnButton';

export interface ICloneServiceCompontentProvidedProps {
  classes: any;
}

export interface ICloneServiceCompontentProps extends ICloneServiceCompontentProvidedProps, RouteChildrenProps {
  language: any;
  repositoryInfo: any;
}

export interface ICloneServiceComponentState {
  createdInfo: any;
  lastChangedInfo: any;
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
};

class CloneServiceComponent extends React.Component<ICloneServiceCompontentProps, ICloneServiceComponentState> {
  public _isMounted = false;
  constructor(_props: any) {
    super(_props);
    this.state = {
      createdInfo: {
        createdBy: '',
        createdDate: '',
      },
      lastChangedInfo: {
        lastChangedBy: '',
        lastChangedDate: '',

      },
    };
  }
  public formatDate(date: any): any {
    return moment(new Date(date)).format('DD.MM.YYYY');
  }

  public componentDidMount() {
    this._isMounted = true;
    const altinnWindow: any = window as any;
    // tslint:disable-next-line:max-line-length
    const url = `${altinnWindow.location.origin}/designerapi/Repository/Log?owner=${(this.props.match.params as any).org}&repository=${(this.props.match.params as any).serviceName}`;
    get(url).then((result: any) => {
      if (this._isMounted && result) {
        if (result.length > 0) {
          const createdInfo = result[result.length - 1];
          const lastChanged = result[0];
          this.setState({
            createdInfo: {
              createdBy: createdInfo.commiter.name,
              createdDate: createdInfo.commiter.when,
            },
            lastChangedInfo: {
              lastChangedBy: lastChanged.commiter.name,
              lastChangedDate: lastChanged.commiter.when,
            },
          });
        }
      }
    });
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }

  public formatNameAndDate(name: string, date: string) {
    const returnDate = date ? moment(new Date(date)).format('DD.MM.YYYY') : date;
    return `${name} ${returnDate}`;
  }

  public redirectToCode = () => {
    window.location.href = `/${this.props.repositoryInfo.full_name}`;
  }

  public cloneAndEditService = () => {

  }

  public render() {
    const { classes } = this.props;
    return (
      <>
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
                {getLanguageFromKey('dashboard.created_by', this.props.language)} {this.formatNameAndDate(this.state.createdInfo.createdBy, this.state.createdInfo.createdDate)}
              </Typography>
              <Typography>
                {/* tslint:disable-next-line:max-line-length */}
                {getLanguageFromKey('dashboard.last_changed_by', this.props.language)} {this.formatNameAndDate(this.state.lastChangedInfo.lastChangedBy, this.state.lastChangedInfo.lastChangedDate)}
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
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: ICloneServiceCompontentProps,
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

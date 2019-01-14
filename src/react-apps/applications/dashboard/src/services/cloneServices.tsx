import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter, RouteChildrenProps } from "react-router";
import { Typography } from '@material-ui/core';
import { getLanguageFromKey } from '../../../shared/src/utils/language';

export interface ICloneServiceCompontentProvidedProps {
  classes: any;
}

export interface ICloneServiceCompontentProps extends ICloneServiceCompontentProvidedProps, RouteChildrenProps {
  language: any;
  isOrg: any;
  repositoryInfo: any;
}

export interface ICloneServiceComponentState {
}

const styles = {
  mainStyle: {
    marginLeft: 120,
    marginTop: '50px',
  }
};

class CloneServiceComponent extends React.Component<ICloneServiceCompontentProps, ICloneServiceComponentState> {

  public componentDidMount() {
    console.log(this.props.repositoryInfo);
  }

  public render() {
    console.log((this.props.match.params as any).serviceName);
    const { classes } = this.props;
    return (
      <>
        {this.props.repositoryInfo &&
          <div className={classes.mainStyle}>
            <Typography component='h1' variant='h1' gutterBottom={true}>
              {this.props.repositoryInfo.name}
            </Typography>
            <div>
              {this.props.repositoryInfo.owner.full_name || this.props.repositoryInfo.owner.login}
            </div>
            <div>
              <Typography>
                {getLanguageFromKey('dashboard.created_by', this.props.language)} props.log.initialLog.user
              </Typography>
              <Typography>
                {getLanguageFromKey('dashboard.last_changed_by', this.props.language)} props.log.lastcommit.user
              </Typography>
            </div>
            <div>
              <Typography>
                {getLanguageFromKey('dashboard.description_header', this.props.language)}
              </Typography>
              <Typography>
                {this.props.repositoryInfo.description}
              </Typography>
            </div>
          </div>
        }
      </>
    );
  }
}

const getOrganizationType = (services: any) => {
  //todo: add check if person or org
  return true;
};

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
    isOrg: getOrganizationType(state.dashboard.services),
    repositoryInfo: getCurrentRepositoryInfo(state.dashboard.services, (props.match.params as any).org, (props.match.params as any).serviceName),
  };
};

export const CloneService = compose(
  withStyles(styles),
  withRouter,
  connect(mapStateToProps),
)(CloneServiceComponent);

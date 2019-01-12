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
  }
};

class CloneServiceComponent extends React.Component<ICloneServiceCompontentProps, ICloneServiceComponentState> {

  public render() {
    console.log((this.props.match.params as any).serviceName);
    const { classes } = this.props;
    return (
      <div className={classes.mainStyle}>
        <Typography component='h1' variant='h1' gutterBottom={true}>
          {(this.props.match.params as any).serviceName}
        </Typography>
        <div>
          Organisasjonsnavn
        </div>

        <div>
          <Typography>
            {getLanguageFromKey('dashboard.created_by', this.props.language)} test
          </Typography>
          <Typography>
            {getLanguageFromKey('dashboard.last_changed_by', this.props.language)} test
          </Typography>
        </div>
        <div>
          <Typography>
            {getLanguageFromKey('dashboard.description_header', this.props.language)}
          </Typography>
          <Typography>
            Skal du flytte innenlands kan du melde fra til folkeregisteret elektronisk. Flytting kan endre hvilken kommune du skal stemme i, skatte til og få offentlige ytelser fra.
          </Typography>
        </div>

      </div>
    );
  }
}

const getOrganizationType = (services: any) => {
  //todo: add check if person or org
  return true;
};

const getCurrentRepositoryInfo = (services: any) => {
  services.filter((service: any) => {
    if ((this.props.match.params as any).serviceName)
  });
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: ICloneServiceCompontentProvidedProps,
): any => {
  return {
    classes: props.classes,
    language: state.language.language,
    isOrg: getOrganizationType(state.dashboard.services),
    repositoryInfo: getCurrentRepositoryInfo(state.dashboard.services),
  };
};

export const CloneService = compose(
  withStyles(styles),
  withRouter,
  connect(mapStateToProps),
)(CloneServiceComponent);

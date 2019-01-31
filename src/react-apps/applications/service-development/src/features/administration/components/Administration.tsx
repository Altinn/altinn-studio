
import { createMuiTheme, createStyles, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnInputField from '../../../../../shared/src/components/AltinnInputField';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';

export interface IAdministationComponentProvidedProps {
  classes: any;
}

export interface IAdministationComponentProps extends IAdministationComponentProvidedProps {
  language: any;
  service: any;
}

export interface IAdministationComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    marginLeft: 60,
    marginTop: 40,
  },
  headerStyle: {
    fontSize: 36,
    marginBottom: 30,
  },
});

export class AdministationComponent extends
  React.Component<IAdministationComponentProps, IAdministationComponentState> {

  constructor(_props: IAdministationComponentProps) {
    super(_props);
  }
  public onServiceNameChanged = () => {

  }

  public render() {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <VersionControlHeader language={this.props.language} />
        <div className={classes.mainStyle}>
          <Typography className={classes.headerStyle}>
            {getLanguageFromKey('administration.administration', this.props.language)}
          </Typography>
          <AltinnInputField
            id={'service-name'}
            onChangeFunction={this.onServiceNameChanged}
            inputHeader={getLanguageFromKey('general.service_name', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_name_administration_description', this.props.language)}
            inputValue={''}
          />
          <AltinnInputField
            id={'service-id'}
            onChangeFunction={this.onServiceNameChanged}
            inputHeader={getLanguageFromKey('administration.service_id', this.props.language)}
            inputDescription={getLanguageFromKey('administration.service_id_description', this.props.language)}
            inputValue={''}
          />
          <AltinnInputField
            id={'repo-name'}
            onChangeFunction={this.onServiceNameChanged}
            inputHeader={getLanguageFromKey('general.service_saved_name', this.props.language)}
            // tslint:disable-next-line:max-line-length
            inputDescription={getLanguageFromKey('administration.service_saved_name_administration_description', this.props.language)}
            inputValue={''}
          />
          <AltinnInputField
            id={'description'}
            onChangeFunction={this.onServiceNameChanged}
            inputHeader={getLanguageFromKey('general.service_description_header', this.props.language)}
            inputDescription={getLanguageFromKey('administration.description_description', this.props.language)}
            inputValue={''}
          />
        </div>

      </React.Fragment >
    );
  }
}
const mapStateToProps = (
  state: IServiceDevelopmentState,
  props: IAdministationComponentProvidedProps,
): IAdministationComponentProps => {
  return {
    language: state.language,
    classes: props.classes,
    service: state.service,
  };
};

export const Administation = withStyles(styles)(connect(mapStateToProps)(AdministationComponent));

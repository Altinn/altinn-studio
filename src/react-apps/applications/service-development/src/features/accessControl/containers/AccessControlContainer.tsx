import { createStyles, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnColumnLayout from '../../../../../shared/src/components/AltinnColumnLayout';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';

const styles = createStyles({
  sectionHeader: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 400,
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarInfoText: {
    fontSize: 16,
  },
});

export interface IAccessControlContainerProvidedProps {
  classes: any;
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export class AccessControlContainerClass extends React.Component<IAccessControlContainerProps> {
  public render() {
    return (
      <AltinnColumnLayout
        aboveColumnChildren={<VersionControlHeader language={this.props.language} />}
        children={this.renderMainContent()}
        sideMenuChildren={this.renderSideMenu()}
        header={getLanguageFromKey('access_control.header', this.props.language)}
      />
    );
  }

  public renderMainContent = (): JSX.Element => {
    return (
      <Typography className={this.props.classes.sectionHeader}>
        Placeholder main content
      </Typography>
    );
  }

  public renderSideMenu = (): JSX.Element => {
    return (
      <>
        <Typography className={this.props.classes.sidebarHeader}>
          Placeholder side menu
        </Typography>
        <Typography className={this.props.classes.sidebarInfoText}>
          Placeholder side menu content
        </Typography>
      </>
    );
  }
}

const mapStateToProps = (
  state: IServiceDevelopmentState,
  props: IAccessControlContainerProvidedProps,
): IAccessControlContainerProps => {
  return {
    language: state.language.language,
    ...props,
  };
};

export default withStyles(styles)(connect(mapStateToProps)(AccessControlContainerClass));

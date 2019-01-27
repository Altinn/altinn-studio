import { createMuiTheme } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import { createStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { IServiceDevelopmentAppState } from '../../../service-development/src/App';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';
import AltinnIcon from './AltinnIcon';

export interface IAltinnInformationCardComponentProvidedProps {
  classes: any;
  headerTextKey?: string;
  subtext1TextKey?: string;
  subtext2TextKey?: string;
  linkTextKey?: string;
  urlKey?: string;
  imageSource?: string;
  language?: any;
  shadow?: boolean;
}

export interface IAltinnInformationCardComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    justifyContent: 'center',
  },
  paper: {
    paddingLeft: '5%',
    paddingTop: 100,
    paddingBottom: 100,
    margin: 150,
    maxWidth: 1088,
    height: 446,
    background: theme.altinnPalette.primary.white,
    boxShadow: '0px 4px 7px rgba(0, 0, 0, 0.14)',
  },
  header: {
    fontSize: 36,
  },
  subText1: {
    paddingTop: 15,
    fontSize: 16,
  },
  subText2: {
    paddingBottom: 39,
  },
  link: {
    fontSize: 16,
  }
});

class AltinnInformationCard extends
  React.Component<IAltinnInformationCardComponentProvidedProps, IAltinnInformationCardComponentState> {

  public render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Grid className={classes.paper} container={true} item={true} xs={12}>
          <Grid container={true} item={true}>
            <Grid xs={7} item={true} container={true}>
              <Grid item={true}>
                <h1 className={classes.header}>
                  {getLanguageFromKey('shared.wip_title', this.props.language)}
                </h1>
                <p className={classes.subText1}>
                  {getLanguageFromKey('shared.wip_subtext_1', this.props.language)}
                </p>
                <p className={classes.subText2}>
                  {getLanguageFromKey('shared.wip_subtext_2', this.props.language)}
                </p>
                <a
                  href={getLanguageFromKey('shared.wip_link_github_url', this.props.language)}
                  className={classes.link}>
                  {getLanguageFromKey('shared.wip_link_text', this.props.language)}
                  <AltinnIcon
                    isActive={true}
                    iconClass='ai ai-arrowrightup'
                    iconColor={theme.altinnPalette.primary.black}
                  />
                </a>
              </Grid>
            </Grid>
            <Grid container={true} xs={5} item={true} spacing={0} justify={'center'} alignContent={'center'}>
              <img alt='complex' src='../../designer/img/illustration-help-circle.svg' />
            </Grid>
          </Grid>
        </Grid>
      </div >
    );
  }
}

const mapStateToProps: (
  state: IServiceDevelopmentAppState,
  props: IAltinnInformationCardComponentProvidedProps,
) => IAltinnInformationCardComponentProvidedProps = (state: IServiceDevelopmentAppState, props: IAltinnInformationCardComponentProvidedProps) => ({
  language: state.language,
  classes: props.classes,
});

export default withStyles(styles)(connect(mapStateToProps)(AltinnInformationCard));

import { createTheme } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { withStyles , createStyles } from '@material-ui/core/styles';

import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import { getLanguageFromKey } from '../utils/language';
import AltinnIconComponent from './AltinnIcon';

export interface IAltinnInformationCardComponentProvidedProps {
  classes: any;
  headerTextKey: string;
  subtext1TextKey: string;
  subtext2TextKey: string;
  linkTextKey: string;
  urlKey: string;
  imageSource: string;
  language?: any;
  shadow: boolean;
}

const theme = createTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    height: '80vh',
  },
  paper: {
    [theme.breakpoints.up('xl')]: {
      paddingLeft: 99,
      paddingTop: 92,
      paddingBottom: 87,
      maxWidth: 1088,
      height: 446,
    },
    [theme.breakpoints.down('lg')]: {
      paddingLeft: 101,
      paddingTop: 82,
      paddingBottom: 97,
      maxWidth: 1088,
      height: 446,
    },
    [theme.breakpoints.down('md')]: {
      paddingLeft: 45,
      paddingTop: 78,
      paddingBottom: 100,
      maxWidth: 944,
      height: 446,
    },
    [theme.breakpoints.only('sm')]: {
      paddingLeft: 56,
      paddingTop: 68,
      paddingBottom: 97,
      maxWidth: 554,
      height: 623,
    },
    background: theme.altinnPalette.primary.white,
  },
  shadowBox: {
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
  },
  smSpacing: {
    [theme.breakpoints.only('sm')]: {
      paddingBottom: 53,
    },
  },
  scrollable: {
    overflowY: 'auto',
    [theme.breakpoints.up('md')]: {
      marginBottom: '40px',
    },
    [theme.breakpoints.down('sm')]: {
      marginBottom: '-15px',
    },
  },
});

export class AltinnInformationCard extends
  React.Component<IAltinnInformationCardComponentProvidedProps> {

  public render() {
    const { classes } = this.props;
    return (
      <Grid
        container={true}
        direction='column'
        className={classes.root}
        spacing={0}
        justify={'center'}
        alignContent={'center'}
      >
        <Grid
          container={true}
          item={true}
          spacing={0}
          justify={'center'}
          alignContent={'center'}
          className={classNames(classes.scrollable)}
        >

          <Grid
            className={classNames(classes.paper, { [classes.shadowBox]: this.props.shadow })}
            container={true}
            item={true}
          >
            <Grid container={true} item={true}>
              <Grid sm={12} md={7} item={true} container={true}>
                <Grid item={true}>
                  <h1 className={classes.header}>
                    {getLanguageFromKey(this.props.headerTextKey, this.props.language)}
                  </h1>
                  <p className={classes.subText1}>
                    {getLanguageFromKey(this.props.subtext1TextKey, this.props.language)}
                  </p>
                  <p className={classes.subText2}>
                    {getLanguageFromKey(this.props.subtext2TextKey, this.props.language)}
                  </p>
                  <div className={classes.smSpacing}>
                    <a
                      href={getLanguageFromKey(this.props.urlKey, this.props.language)}
                      className={classes.link}
                    >
                      {getLanguageFromKey(this.props.linkTextKey, this.props.language)}
                      <AltinnIconComponent
                        isActive={true}
                        iconClass='fa fa-arrowrightup'
                        iconColor={theme.altinnPalette.primary.black}
                      />
                    </a>
                  </div>
                </Grid>
              </Grid>
              <Grid container={true} sm={12} md={5} item={true} spacing={0} justify={'center'} alignContent={'center'}>
                <img alt='information' src={this.props.imageSource} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid >
    );
  }
}

export default withStyles(styles)(AltinnInformationCard);

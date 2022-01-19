import { createTheme } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createStyles , makeStyles } from '@material-ui/core/styles';

import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from './../../theme/altinnStudioTheme';

export interface IAltinnInformationCardComponentProvidedProps {
  headerText: string;
  imageSource: string;
  shadow: boolean;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
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
    breadText: {
      paddingTop: 15,
      fontSize: 16,
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
  }),
);

const AltinnInformationCardForChildren =
(props: React.PropsWithChildren<IAltinnInformationCardComponentProvidedProps>) => {
  const classes = useStyles(props);

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
          className={classNames(classes.paper, { [classes.shadowBox]: props.shadow })}
          container={true}
          item={true}
        >
          <Grid container={true} item={true}>
            <Grid sm={12} md={7} item={true} container={true}>
              <Grid item={true}>
                <div>
                  <h1 className={classes.header}>
                    {props.headerText}
                  </h1>
                  <p className={classes.breadText}>
                    {props.children}
                  </p>
                </div>
              </Grid>
            </Grid>
            <Grid container={true} sm={12} md={5} item={true} spacing={0} justify={'center'} alignContent={'center'}>
              <img alt='information' src={props.imageSource} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid >
  );
};

export default AltinnInformationCardForChildren;

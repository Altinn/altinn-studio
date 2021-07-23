import { createTheme } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../../theme/altinnStudioTheme';
import createInformationCardStyles from '../styles/createInformationCardStyles';

export interface IAltinnInformationCardComponentProvidedProps {
  headerText: string;
  imageSource: string;
  shadow: boolean;
  classes: any;
}

export interface IAltinnInformationCardComponentState {
}

const theme = createTheme(altinnTheme);

const styles = () => createInformationCardStyles(theme, {
  breadText: {
    paddingTop: 15,
    fontSize: 16,
    paddingBottom: 39,
  },
});

const AltinnInformationCardForChildren =
(props: React.PropsWithChildren<IAltinnInformationCardComponentProvidedProps>) => {
  const { classes } = props;

  return (
    <Grid
      container={true}
      direction='column'
      className={classes.root}
      spacing={0}
      justify='center'
      alignContent='center'
    >
      <Grid
        container={true}
        item={true}
        spacing={0}
        justify='center'
        alignContent='center'
        className={classNames(classes.scrollable)}
      >

        <Grid
          className={classNames(classes.paper, { [classes.shadowBox]: props.shadow })}
          container={true}
          item={true}
        >
          <Grid container={true} item={true}>
            <Grid
              sm={12} md={7}
              item={true} container={true}
            >
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
            <Grid
              container={true} sm={12}
              md={5} item={true}
              spacing={0} justify='center'
              alignContent='center'
            >
              <img alt='information' src={props.imageSource} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid >
  );
};

export default withStyles(styles)(AltinnInformationCardForChildren);


import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  columnContainer: {
    maxWidth: '875px',
    paddingTop: '2rem',
    [theme.breakpoints.up('md')]: {
      width: '80%',
    },
    [theme.breakpoints.down('sm')]: {
      width: '95%',
    },
  },
  rowContainer: {
    width: '100%',
  },
  headerItem: {

  },
});

function Header(props) {
  const { classes } = props;
  return (
    <div className={'container'}>
      <Grid
        className={classes.columnContainer}
        container={true}
        direction={'column'}
        alignItems={'center'}
      >
        <Grid
          className={classes.rowContainer}
          container={true}
          direction={'row'}
          justify={'space-between'}
        >
          <Grid
            item={true}
            className={classes.headerItem}
          >
            <img
              src='/designer/img/a-logo-blue.svg'
              alt='Altinn logo'
              className='a-logo a-modal-top-logo'
            />
          </Grid>
          <Grid
            item={true}
            className={classes.headerItem}
          >
            <h4>Profile</h4>
            {/* TODO: add profile components */}
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}

export default withStyles(styles)(Header);

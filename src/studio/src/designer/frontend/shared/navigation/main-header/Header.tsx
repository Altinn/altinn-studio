import { AppBar, Grid, makeStyles, Toolbar } from '@material-ui/core';
import { altinnWhiteImgLogoHeaderUrl } from 'app-shared/utils/urlHelper';
import * as React from 'react';
import { IUser } from 'app-shared/types';
import { HeaderMenu }  from './HeaderMenu';

const useStyles = makeStyles((theme) => ({
  appBar: {
    backgroundColor: theme.altinnPalette.primary.blueDarker,
    boxShadow: 'none',
  },
  toolbar: {
    height: 96,
    paddingLeft: 48,
    paddingRight: 48
  },
}));

export interface IHeaderProps {
  user?: IUser;
  context?: string;
}

export function Header({ user, context }: IHeaderProps) {
  const classes = useStyles();
  return (
    <AppBar
      className={classes.appBar}
      position='static'
    >
      <Toolbar className={classes.toolbar}>
        <Grid
          container
          direction='row'
          alignItems='center'
          justifyContent='space-between'
        >
          <Grid item xs={6} justifyContent='flex-start'>
            <a href='/'>
              <img src={altinnWhiteImgLogoHeaderUrl} alt='Altinn logo' />
            </a>
          </Grid>
          <Grid item justifyContent='flex-end'>
            <HeaderMenu user={user} org={context}/>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

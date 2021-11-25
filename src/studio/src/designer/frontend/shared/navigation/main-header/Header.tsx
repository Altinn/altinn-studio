import { AppBar, Grid, makeStyles, Toolbar } from '@material-ui/core';
import { IGiteaOrganisation, IUser } from 'app-shared/types';
import { altinnWhiteImgLogoHeaderUrl } from 'app-shared/utils/urlHelper';
import * as React from 'react';
import { HeaderMenu }  from './HeaderMenu';

export interface IHeaderContext {
  selectedContext: string | number;
  selectableOrgs: IGiteaOrganisation[];
  setSelectedContext: (context: string | number) => void;
  user: IUser;
}

export const HeaderContext = React.createContext<IHeaderContext>({
  selectedContext: undefined,
  selectableOrgs: undefined,
  setSelectedContext: undefined,
  user: undefined,
});

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

export function Header() {
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
            <HeaderMenu />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

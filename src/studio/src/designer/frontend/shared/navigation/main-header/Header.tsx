import { AppBar, Grid, makeStyles, Toolbar, Typography } from '@material-ui/core';
import { IGiteaOrganisation, IUser } from 'app-shared/types';
import * as React from 'react';
import AltinnStudioLogo from './AltinnStudioLogo';
import { HeaderMenu } from './HeaderMenu';

export enum SelectedContextType {
  All = 'all',
  Self = 'self',
}

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
    paddingRight: 48,
  },
  typography: {
    fontSize: '1.75rem',
  },
  divider: {
    fontSize: '2rem',
    marginLeft: 10,
    marginRight: 10,
  }
}));

export const getOrgNameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((org) => org.id === id);
  return org?.full_name || org?.username;
};

export function Header() {
  const classes = useStyles();
  const { selectedContext, selectableOrgs } = React.useContext(HeaderContext);
  return (
    <AppBar className={classes.appBar} position='static'>
      <Toolbar className={classes.toolbar}>
        <Grid
          container
          direction='row'
          alignItems='center'
          justifyContent='space-between'
        >
          <Grid item container xs={6} alignItems='center'>
            <Grid item>
              <a href='/'>
                <AltinnStudioLogo />
              </a>
            </Grid>
            {selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self &&
              <Grid>
                <Typography className={classes.typography}>
                  <span className={classes.divider}>/</span>
                  {getOrgNameById(selectedContext as number, selectableOrgs)}
                </Typography>
              </Grid>
            }
          </Grid>
          <Grid item>
            <HeaderMenu />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

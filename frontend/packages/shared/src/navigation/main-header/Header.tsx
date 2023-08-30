import React from 'react';
import { AppBar, Grid, Toolbar, Typography } from '@mui/material';
import type { IGiteaOrganisation, IUser } from '../../types/global';
import AltinnStudioLogo from './AltinnStudioLogo';
import { HeaderMenu } from './HeaderMenu';
import classes from './Header.module.css';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';

export enum SelectedContextType {
  All = 'all',
  Self = 'self',
}

export interface IHeaderContext {
  selectableOrgs: IGiteaOrganisation[];
  user: IUser;
}

export const HeaderContext = React.createContext<IHeaderContext>({
  selectableOrgs: undefined,
  user: undefined,
});

export const getOrgNameByUsername = (username: string, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.full_name || org?.username;
};

export const getOrgUsernameByUsername = (username: string, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.username;
};

export function Header() {
  const { selectableOrgs } = React.useContext(HeaderContext);
  const selectedContext = useSelectedContext();

  return (
    <AppBar className={classes.appBar} position='static'>
      <Toolbar className={classes.toolbar}>
        <Grid container direction='row' alignItems='center' justifyContent='space-between'>
          <Grid item container xs={6} alignItems='center'>
            <Grid item>
              <a href='/'>
                <AltinnStudioLogo />
              </a>
            </Grid>
            {selectedContext !== SelectedContextType.All &&
              selectedContext !== SelectedContextType.Self && (
                <Grid>
                  <Typography sx={{ fontSize: '1rem' }}>
                    <span className={classes.divider}>/</span>
                    {getOrgNameByUsername(selectedContext, selectableOrgs)}
                  </Typography>
                </Grid>
              )}
          </Grid>
          <Grid item>
            <HeaderMenu org={getOrgUsernameByUsername(selectedContext, selectableOrgs)} />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

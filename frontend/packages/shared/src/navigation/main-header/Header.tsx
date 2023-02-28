import React from 'react';
import { AppBar, Grid, Toolbar, Typography } from '@mui/material';
import type { IGiteaOrganisation, IUser } from '../../types/global';
import AltinnStudioLogo from './AltinnStudioLogo';
import { HeaderMenu } from './HeaderMenu';
import classes from './Header.module.css';

export enum SelectedContextType {
  All = 'all',
  Self = 'self',
}

export interface IHeaderContext {
  selectedContext: string | number;
  selectableOrgs: IGiteaOrganisation[];
  setSelectedContext: React.Dispatch<React.SetStateAction<number | SelectedContextType>>;
  user: IUser;
}

export const HeaderContext = React.createContext<IHeaderContext>({
  selectedContext: undefined,
  selectableOrgs: undefined,
  setSelectedContext: undefined,
  user: undefined,
});

export const getOrgNameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.id === id);
  return org?.full_name || org?.username;
};

export const getOrgUsernameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.id === id);
  return org?.username;
};

export function Header() {
  const { selectedContext, selectableOrgs } = React.useContext(HeaderContext);

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
                <Grid data-testid='Header-org-name'>
                  <Typography sx={{ fontSize: '1rem' }}>
                    <span className={classes.divider}>/</span>
                    {getOrgNameById(selectedContext as number, selectableOrgs)}
                  </Typography>
                </Grid>
              )}
          </Grid>
          <Grid item>
            <HeaderMenu org={getOrgUsernameById(selectedContext as number, selectableOrgs)} />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

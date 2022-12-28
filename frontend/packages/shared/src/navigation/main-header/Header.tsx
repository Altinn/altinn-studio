import React from 'react';
import { AppBar, Grid, Toolbar, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import type { IGiteaOrganisation, IUser } from '../../types/global';
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

type HeaderProps = {
  language: any;
};

const useStyles = makeStyles(() => ({
  appBar: {
    backgroundColor: '#022F51',
    boxShadow: 'none',
  },
  toolbar: {
    height: 96,
    paddingLeft: 48,
    paddingRight: 48,
  },
  divider: {
    fontSize: '2rem',
    marginLeft: 10,
    marginRight: 10,
  },
}));

export const getOrgNameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.id === id);
  return org?.full_name || org?.username;
};

export const getOrgUsernameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((o) => o.id === id);
  return org?.username;
};

export function Header({ language }: HeaderProps) {
  const classes = useStyles();
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
                  <Typography sx={{ fontSize: '1.75rem' }}>
                    <span className={classes.divider}>/</span>
                    {getOrgNameById(selectedContext as number, selectableOrgs)}
                  </Typography>
                </Grid>
              )}
          </Grid>
          <Grid item>
            <HeaderMenu
              language={language}
              org={getOrgUsernameById(selectedContext as number, selectableOrgs)}
            />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

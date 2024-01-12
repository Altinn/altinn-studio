import React from 'react';

import { AppBar, Grid, Toolbar } from '@material-ui/core';
import { Buldings3Icon, PersonIcon } from '@navikt/aksel-icons';

import classes from 'src/components/AltinnAppHeader.module.css';
import { CircleIcon } from 'src/components/CircleIcon';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { Lang } from 'src/features/language/Lang';
import { renderParty } from 'src/utils/party';
import { returnUrlToAllSchemas, returnUrlToMessagebox, returnUrlToProfile } from 'src/utils/urls/urlHelper';
import type { IProfile } from 'src/types/shared';

export interface IHeaderProps {
  profile: IProfile | undefined;
}

export const AltinnAppHeader = ({ profile }: IHeaderProps) => {
  const party = profile?.party;

  return (
    <div
      className={classes.appBarWrapper}
      data-testid='AltinnAppHeader'
    >
      <LandmarkShortcuts
        shortcuts={[
          {
            id: 'main-content',
            text: <Lang id='navigation.to_main_content' />,
          },
        ]}
      />
      <AppBar
        position='static'
        className={classes.default}
      >
        <Toolbar className={classes.toolbarContainer}>
          <Grid
            item={true}
            className={classes.logo}
          >
            <AltinnLogo color={LogoColor.blueDark} />
          </Grid>
          {party && (
            <ul className={classes.headerLinkList}>
              <li className={classes.headerLink}>
                <a href={returnUrlToMessagebox(window.location.origin, party?.partyId) || '#'}>
                  <Lang id='instantiate.inbox' />
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToAllSchemas(window.location.origin) || '#'}>
                  <Lang id='instantiate.all_forms' />
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToProfile(window.location.origin, party?.partyId) || '#'}>
                  <Lang id='instantiate.profile' />
                </a>
              </li>
            </ul>
          )}
          {party && (
            <CircleIcon
              size='1.5rem'
              className={classes.partyIcon}
              title={renderParty(profile) || ''}
            >
              {party.orgNumber ? (
                <Buldings3Icon
                  color='white'
                  aria-hidden='true'
                />
              ) : (
                <PersonIcon
                  color='white'
                  aria-hidden='true'
                />
              )}
            </CircleIcon>
          )}
        </Toolbar>
      </AppBar>
    </div>
  );
};

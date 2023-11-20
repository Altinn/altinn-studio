import React from 'react';

import { AppBar, Grid, Toolbar } from '@material-ui/core';
import cn from 'classnames';

import classes from 'src/components/AltinnAppHeader.module.css';
import { AltinnLogo } from 'src/components/AltinnLogo';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { useLanguage } from 'src/hooks/useLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { renderParty } from 'src/utils/party';
import { returnUrlToAllSchemas, returnUrlToMessagebox, returnUrlToProfile } from 'src/utils/urls/urlHelper';
import type { IProfile } from 'src/types/shared';

export interface IHeaderProps {
  profile: IProfile;
  type?: string;
}

export const AltinnAppHeader = ({ type, profile }: IHeaderProps) => {
  const party = profile?.party;
  const { langAsString } = useLanguage();
  const blueClass = type ? classes.blueDark : classes.blueDarker;

  return (
    <div
      className={classes.appBarWrapper}
      data-testid='AltinnAppHeader'
    >
      <LandmarkShortcuts
        shortcuts={[
          {
            id: 'main-content',
            text: langAsString('navigation.to_main_content'),
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
            className={cn(classes.logo, !type && classes.gridStyle)}
          >
            <AltinnLogo
              color={
                type === 'partyChoice'
                  ? AltinnAppTheme.altinnPalette.primary.blueDark
                  : AltinnAppTheme.altinnPalette.primary.blueDarker
              }
            />
          </Grid>
          {type && party && (
            <ul className={classes.headerLinkList}>
              <li className={classes.headerLink}>
                <a href={returnUrlToMessagebox(window.location.origin, party?.partyId) || '#'}>
                  {langAsString('instantiate.inbox')}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToAllSchemas(window.location.origin) || '#'}>
                  {langAsString('instantiate.all_forms')}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToProfile(window.location.origin, party?.partyId) || '#'}>
                  {langAsString('instantiate.profile')}
                </a>
              </li>
            </ul>
          )}
          {party && (
            <div title={renderParty(profile) || ''}>
              <span className={cn('a-personSwitcher-name', classes.spanStyle)}>
                {!type && (
                  <>
                    <span className={`d-block ${blueClass}`}>{renderParty(profile)}</span>
                    <span className={blueClass}>
                      {party &&
                        party.organization &&
                        `${langAsString('general.for')} ${party.organization.name.toUpperCase()}`}
                    </span>
                  </>
                )}
                <span className='d-block' />
              </span>
              {party && party.organization ? (
                <i
                  className={`fa fa-corp-circle-big ${classes.partyIcon} ${blueClass}`}
                  aria-hidden='true'
                />
              ) : (
                <i
                  className={`fa fa-private-circle-big ${classes.partyIcon} ${blueClass}`}
                  aria-hidden='true'
                />
              )}
            </div>
          )}
        </Toolbar>
      </AppBar>
    </div>
  );
};

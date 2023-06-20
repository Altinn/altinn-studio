import React from 'react';

import { AppBar } from '@material-ui/core';

import { AltinnLogo } from 'src/components/AltinnLogo';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import classes from 'src/components/organisms/AltinnAppHeader.module.css';
import { AltinnAppHeaderMenu } from 'src/components/organisms/AltinnAppHeaderMenu';
import { useLanguage } from 'src/hooks/useLanguage';
import { renderPartyName } from 'src/utils/party';
import type { IParty } from 'src/types/shared';

export interface IAltinnAppHeaderProps {
  /** The party of the instance owner */
  party: IParty | undefined;
  /** The party of the currently logged in user */
  userParty: IParty | undefined;
  logoColor: string;
  headerBackgroundColor: string;
}

export const AltinnAppHeader = ({ logoColor, headerBackgroundColor, party, userParty }: IAltinnAppHeaderProps) => {
  const { langAsString } = useLanguage();

  return (
    <AppBar
      data-testid='AltinnAppHeader'
      position='relative'
      classes={{ root: classes.appBar }}
      style={{ backgroundColor: headerBackgroundColor, color: logoColor }}
    >
      <LandmarkShortcuts
        shortcuts={[
          {
            id: 'main-content',
            text: langAsString('navigation.to_main_content'),
          },
        ]}
      />
      <div className={classes.container}>
        <AltinnLogo color={logoColor} />
        <div className={classes.wrapper}>
          {party && userParty && party.partyId === userParty.partyId && (
            <span className={classes.appBarText}>{renderPartyName(userParty)}</span>
          )}
          {party && userParty && party.partyId !== userParty.partyId && (
            <>
              <span className={classes.appBarText}>
                {renderPartyName(userParty)} for {renderPartyName(party)}
              </span>
            </>
          )}
          <AltinnAppHeaderMenu
            party={party}
            logoColor={logoColor}
            logoutText={langAsString('general.log_out')}
            ariaLabel={langAsString('general.header_profile_icon_label')}
          />
        </div>
      </div>
    </AppBar>
  );
};

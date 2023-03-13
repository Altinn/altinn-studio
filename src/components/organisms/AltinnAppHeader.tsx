import React from 'react';

import { AppBar } from '@material-ui/core';

import { AltinnLogo } from 'src/components/AltinnLogo';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import classes from 'src/components/organisms/AltinnAppHeader.module.css';
import { AltinnAppHeaderMenu } from 'src/components/organisms/AltinnAppHeaderMenu';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { renderPartyName } from 'src/utils/party';
import type { ILanguage, IParty } from 'src/types/shared';

export interface IAltinnAppHeaderProps {
  /** The party of the instance owner */
  party: IParty | undefined;
  /** The party of the currently logged in user */
  userParty: IParty | undefined;
  logoColor: string;
  headerBackgroundColor: string;
  language: ILanguage;
}

export const AltinnAppHeader = ({
  logoColor,
  headerBackgroundColor,
  party,
  userParty,
  language,
}: IAltinnAppHeaderProps) => (
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
          text: getLanguageFromKey('navigation.to_main_content', language),
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
          logoutText={getLanguageFromKey('general.log_out', language)}
          ariaLabel={getLanguageFromKey('general.header_profile_icon_label', language)}
        />
      </div>
    </div>
  </AppBar>
);

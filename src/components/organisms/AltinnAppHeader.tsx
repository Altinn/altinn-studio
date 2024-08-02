import React from 'react';

import { AppBar } from '@material-ui/core';

import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { AltinnLogo } from 'src/components/logo/AltinnLogo';
import classes from 'src/components/organisms/AltinnAppHeader.module.css';
import { AltinnAppHeaderMenu } from 'src/components/organisms/AltinnAppHeaderMenu';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { useHasAppTextsYet } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { Lang } from 'src/features/language/Lang';
import { renderPartyName } from 'src/utils/party';
import type { LogoColor } from 'src/components/logo/AltinnLogo';
import type { IParty } from 'src/types/shared';

export interface IAltinnAppHeaderProps {
  /** The party of the instance owner */
  party: IParty | undefined;
  /** The party of the currently logged in user */
  userParty: IParty | undefined;
  logoColor: LogoColor;
  headerBackgroundColor: string;
}

export const AltinnAppHeader = ({ logoColor, headerBackgroundColor, party, userParty }: IAltinnAppHeaderProps) => (
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
          text: <Lang id={'navigation.to_main_content'} />,
        },
      ]}
    />
    <div className={classes.container}>
      <Logo color={logoColor} />
      <div className={classes.wrapper}>
        {party && userParty && party.partyId === userParty.partyId && (
          <span className={classes.appBarText}>{renderPartyName(userParty)}</span>
        )}
        {party && userParty && party.partyId !== userParty.partyId && (
          <span className={classes.appBarText}>
            {renderPartyName(userParty)} for {renderPartyName(party)}
          </span>
        )}
        <AltinnAppHeaderMenu
          party={party}
          logoColor={logoColor}
        />
      </div>
    </div>
  </AppBar>
);

const Logo = ({ color }: { color: LogoColor }) => {
  const hasLoaded = useHasAppTextsYet();

  return hasLoaded ? <MaybeOrganisationLogo color={color} /> : <AltinnLogo color={color} />;
};

const MaybeOrganisationLogo = ({ color }: { color: LogoColor }) => {
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);
  return enableOrgLogo ? <OrganisationLogo /> : <AltinnLogo color={color} />;
};

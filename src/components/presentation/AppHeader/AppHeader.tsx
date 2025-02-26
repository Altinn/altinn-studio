import React from 'react';

import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { AltinnLogo } from 'src/components/logo/AltinnLogo';
import classes from 'src/components/presentation/AppHeader/AppHeader.module.css';
import { AppHeaderMenu } from 'src/components/presentation/AppHeader/AppHeaderMenu';
import { LanguageSelector } from 'src/components/presentation/LanguageSelector';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { useHasAppTextsYet } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { Lang } from 'src/features/language/Lang';
import { getPartyDisplayName } from 'src/utils/party';
import type { LogoColor } from 'src/components/logo/AltinnLogo';
import type { IParty, IProfile } from 'src/types/shared';

export interface AppHeaderProps {
  /** The party of the instance owner */
  party: IParty | undefined;
  /** The party of the currently logged in user */
  user: IProfile | undefined;
  logoColor: LogoColor;
  headerBackgroundColor: string;
}

export const AppHeader = ({ logoColor, headerBackgroundColor, party, user }: AppHeaderProps) => {
  const { showLanguageSelector } = usePageSettings();

  return (
    <header
      data-testid='AppHeader'
      style={{ backgroundColor: headerBackgroundColor, color: logoColor }}
    >
      <LandmarkShortcuts
        shortcuts={[
          {
            id: 'main-content',
            text: <Lang id='navigation.to_main_content' />,
          },
        ]}
      />
      <div className={classes.container}>
        <Logo color={logoColor} />
        <div className={classes.wrapper}>
          {showLanguageSelector && <LanguageSelector />}
          <div className={classes.wrapper}>
            <span className={classes.partyName}>{getPartyDisplayName(party, user)}</span>
            <AppHeaderMenu
              party={party}
              user={user}
              logoColor={logoColor}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

const Logo = ({ color }: { color: LogoColor }) => {
  const hasLoaded = useHasAppTextsYet();

  return hasLoaded ? <MaybeOrganisationLogo color={color} /> : <AltinnLogo color={color} />;
};

const MaybeOrganisationLogo = ({ color }: { color: LogoColor }) => {
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);
  return enableOrgLogo ? <OrganisationLogo /> : <AltinnLogo color={color} />;
};

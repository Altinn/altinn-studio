import React from 'react';

import { Buildings3Icon, PersonIcon } from '@navikt/aksel-icons';

import { CircleIcon } from 'src/components/CircleIcon';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { PlatformLink } from 'src/components/PlatformLink/PlatformLink';
import classes from 'src/features/instantiate/instantiateHeader/InstantiateHeader.module.css';
import { Lang } from 'src/features/language/Lang';
import { getMessageBoxUrl, returnUrlToAllForms, returnUrlToProfile } from 'src/utils/urls/urlHelper';
import type { IProfile } from 'src/types/shared';

export interface InstantiateHeaderProps {
  profile?: IProfile;
}

export const InstantiateHeader = ({ profile }: InstantiateHeaderProps) => {
  const party = profile?.party;
  const inboxUrl = getMessageBoxUrl(party?.partyId);
  const allFormsUrl = returnUrlToAllForms();
  const profileUrl = returnUrlToProfile();

  return (
    <div
      className={classes.appBarWrapper}
      data-testid='InstantiateHeader'
    >
      <header className={classes.appBar}>
        <LandmarkShortcuts
          shortcuts={[
            {
              id: 'main-content',
              text: <Lang id='navigation.to_main_content' />,
            },
          ]}
        />
        <AltinnLogo
          color={LogoColor.blueDark}
          className={classes.logo}
        />
        {party && (
          <ul className={classes.headerLinkList}>
            <li className={classes.headerLink}>
              <PlatformLink
                className='altinnLink'
                href={inboxUrl}
                setting='ArbeidsflateInboxUrl'
              >
                <Lang id='instantiate.inbox' />
              </PlatformLink>
            </li>
            <li className={classes.headerLink}>
              <PlatformLink
                className='altinnLink'
                href={allFormsUrl}
                setting='AllFormsUrl'
              >
                <Lang id='instantiate.all_forms' />
              </PlatformLink>
            </li>
            <li className={classes.headerLink}>
              <PlatformLink
                className='altinnLink'
                href={profileUrl}
                setting='ArbeidsflateProfileUrl'
              >
                <Lang id='instantiate.profile' />
              </PlatformLink>
            </li>
          </ul>
        )}
        {party && (
          <CircleIcon
            size='1.5rem'
            className={classes.partyIcon}
            title={profile.party?.person?.name}
          >
            {party.orgNumber ? (
              <Buildings3Icon
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
      </header>
    </div>
  );
};

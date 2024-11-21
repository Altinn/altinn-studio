import React from 'react';

import { Popover } from '@digdir/designsystemet-react';
import { Buildings3Icon, PersonIcon } from '@navikt/aksel-icons';

import { CircleIcon } from 'src/components/CircleIcon';
import classes from 'src/components/organisms/AltinnAppHeaderMenu.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { logoutUrlAltinn } from 'src/utils/urls/urlHelper';
import type { IParty } from 'src/types/shared';

export interface IAltinnAppHeaderMenuProps {
  party: IParty | undefined;
  logoColor: string;
}

export function AltinnAppHeaderMenu({ party, logoColor }: IAltinnAppHeaderMenuProps) {
  const { langAsString } = useLanguage();

  if (!party) {
    return null;
  }

  return (
    <>
      <Popover placement='bottom'>
        <Popover.Trigger
          size='sm'
          variant='tertiary'
          style={{ padding: 0 }}
          aria-label={langAsString('general.header_profile_icon_label')}
        >
          <CircleIcon
            size='1.5rem'
            color={logoColor}
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
        </Popover.Trigger>
        <Popover.Content className={classes.popoverContent}>
          <a
            className={'altinnLink'}
            href={logoutUrlAltinn(window.location.origin)}
          >
            <Lang id='general.log_out' />
          </a>
        </Popover.Content>
      </Popover>
    </>
  );
}

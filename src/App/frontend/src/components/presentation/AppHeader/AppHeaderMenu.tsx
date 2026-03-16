import React, { useState } from 'react';

import { Button, Dropdown } from '@digdir/designsystemet-react';
import { Buildings3Icon, PersonIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { CircleIcon } from 'src/components/CircleIcon';
import classes from 'src/components/presentation/AppHeader/AppHeaderMenu.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useInstanceOwnerParty, useSelectedParty } from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { logoutUrlAltinn } from 'src/utils/urls/urlHelper';

export interface AppHeaderMenuProps {
  logoColor: string;
}

export function AppHeaderMenu({ logoColor }: AppHeaderMenuProps) {
  const { langAsString } = useLanguage();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const userParty = useProfile()?.party;
  const onBehalfOf = useGetOnBehalfOf();

  const displayName = userParty?.name + (onBehalfOf ? ` for ${onBehalfOf.name}` : '');

  if (!userParty && !onBehalfOf) {
    return <div style={{ height: 40 }} />;
  }

  return (
    <>
      <span className={classes.partyName}>{displayName}</span>
      <Dropdown.TriggerContext>
        <Dropdown.Trigger
          variant='tertiary'
          style={{ padding: 0, borderRadius: '50%' }}
          aria-label={langAsString('general.header_profile_icon_label')}
          onClick={() => setIsOpen((o) => !o)}
          className={cn({ [classes.buttonActive]: isOpen })}
        >
          <CircleIcon
            size='1.5rem'
            color={logoColor}
          >
            {onBehalfOf?.orgNumber ? (
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
        </Dropdown.Trigger>
        <Dropdown
          data-testid='app-header-menu'
          data-size='sm'
          open={isOpen}
          onClose={() => setIsOpen(false)}
        >
          {isMobile && <Dropdown.Heading>{displayName}</Dropdown.Heading>}
          <Dropdown.List>
            <Dropdown.Item>
              <Button
                variant='tertiary'
                asChild
              >
                <a href={logoutUrlAltinn(window.location.host)}>
                  <Lang id='general.log_out' />
                </a>
              </Button>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      </Dropdown.TriggerContext>
    </>
  );
}

/**
 * The AppHeader should display text to inform the current user about the current context:
 * - When there is an instance ID in the URL: '$user.name for $instanceOwner'
 * - When the user has chosen a different party than themselves through party selection (and there is not an instance ID in the URL): '$user.name for $selectedParty'
 * - In all other cases: '$user.name'
 */
function useGetOnBehalfOf() {
  const instanceOwnerParty = useInstanceOwnerParty();
  const selectedParty = useSelectedParty();
  const userParty = useProfile()?.party;

  const onBehalfOfParty = instanceOwnerParty ?? selectedParty;

  if (!!onBehalfOfParty && !!userParty && onBehalfOfParty.partyId !== userParty.partyId) {
    return {
      name: onBehalfOfParty?.name,
      orgNumber: onBehalfOfParty?.orgNumber,
    };
  }

  return null;
}

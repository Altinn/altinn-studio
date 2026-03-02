import React, { useState } from 'react';

import { Button, Dropdown } from '@digdir/designsystemet-react';
import { Buildings3Icon, PersonIcon } from '@navikt/aksel-icons';
import { GlobalData } from 'nextsrc/core/globalData';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

import menuClasses from 'src/components/presentation/AppHeader/AppHeaderMenu.module.css';
import circleClasses from 'src/components/CircleIcon.module.css';
import { logoutUrlAltinn } from 'src/utils/urls/urlHelper';

const LOGO_COLOR = '#022F51';
const ALTINN_LOGO_URL = 'https://altinncdn.no/img/Altinn-logo-blue.svg';

const headerStyle: React.CSSProperties = {
  backgroundColor: '#EFEFEF',
  width: '100%',
};

const innerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.5rem',
  maxWidth: 1056,
  margin: '0 auto',
  padding: '24px',
  boxSizing: 'border-box',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.5rem',
};

const logoStyle: React.CSSProperties = {
  height: 28,
  display: 'inline-block',
};

/**
 * Resolves the org logo URL based on applicationMetadata.logo.source:
 * - 'org': uses orgLogoUrl from global window data
 * - 'resource': resolves from text resource key 'appLogo.url'
 * - undefined/missing: no org logo (falls back to Altinn logo)
 */
function useOrgLogoUrl(langAsString: (key: string) => string): string | undefined {
  const logo = GlobalData.applicationMetadata.logo;
  if (!logo) {
    return undefined;
  }

  const source = logo.source ?? 'org';
  if (source === 'org') {
    return (window as unknown as Record<string, { orgLogoUrl?: string }>).altinnAppGlobalData
      ?.orgLogoUrl;
  }

  // source === 'resource': resolve from text resources
  const resolved = langAsString('appLogo.url');
  if (resolved === 'appLogo.url') {
    return undefined;
  }
  // The text resource returns a relative path (e.g. "assets/altinn-logo.svg"),
  // prefix with the app base path to get the full URL
  return `${GlobalData.basename}/${resolved}`;
}

export function AltinnAppHeader() {
  const { langAsString } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const userProfile = GlobalData.userProfile;
  const userParty = userProfile?.party;
  const selectedParty = GlobalData.selectedParty;

  const onBehalfOf =
    selectedParty && userParty && selectedParty.partyId !== userParty.partyId ? selectedParty : null;

  const displayName = userParty?.name
    ? userParty.name + (onBehalfOf ? ` for ${onBehalfOf.name}` : '')
    : '';

  const orgLogoUrl = useOrgLogoUrl(langAsString);

  return (
    <header style={headerStyle}>
      <div style={innerStyle}>
        <div style={rowStyle}>
          <img
            style={logoStyle}
            alt={orgLogoUrl ? 'Logo' : 'Altinn logo'}
            src={orgLogoUrl ?? ALTINN_LOGO_URL}
          />
        </div>
        <div style={rowStyle}>
          {userParty && (
            <>
              <span className={menuClasses.partyName}>{displayName}</span>
              <Dropdown.TriggerContext>
                <Dropdown.Trigger
                  variant='tertiary'
                  style={{ padding: 0, borderRadius: '50%' }}
                  aria-label={langAsString('general.header_profile_icon_label')}
                  onClick={() => setIsOpen((o) => !o)}
                >
                  <div
                    className={circleClasses.circle}
                    style={
                      {
                        '--icon-size': '1.5rem',
                        backgroundColor: LOGO_COLOR,
                      } as React.CSSProperties
                    }
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
                  </div>
                </Dropdown.Trigger>
                <Dropdown
                  data-testid='app-header-menu'
                  data-size='sm'
                  open={isOpen}
                  onClose={() => setIsOpen(false)}
                >
                  <Dropdown.List>
                    <Dropdown.Item>
                      <Button
                        variant='tertiary'
                        asChild
                      >
                        <a href={logoutUrlAltinn(window.location.host)}>
                          {langAsString('general.log_out')}
                        </a>
                      </Button>
                    </Dropdown.Item>
                  </Dropdown.List>
                </Dropdown>
              </Dropdown.TriggerContext>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

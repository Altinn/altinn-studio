import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import {
  notConfiguredPlatformSetting,
  PlatformLink,
  platformLinkHref,
  platformLinkNotConfiguredMessage,
} from 'src/components/PlatformLink/PlatformLink';
import { Lang } from 'src/features/language/Lang';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

describe('PlatformLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a plain link to the URL configured for its setting', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(
      <PlatformLink
        setting='AllFormsUrl'
        className='altinnLink'
      >
        Alle skjema
      </PlatformLink>,
    );
    const link = screen.getByRole('link', { name: 'Alle skjema' });

    expect(link).toHaveAttribute('href', 'https://tt02.altinn.no/skjemaoversikt');
    expect(link).toHaveClass('altinnLink');
    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('title');
    expect(fireEvent.click(link)).toBe(true);
    expect(alert).not.toHaveBeenCalled();
  });

  describe('the inbox link', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    function inboxHref(props: { partyId?: number; dialogId?: string }) {
      render(
        <PlatformLink
          setting='ArbeidsflateInboxUrl'
          {...props}
        >
          Innboks
        </PlatformLink>,
      );
      return screen.getByRole('link', { name: 'Innboks' }).getAttribute('href');
    }

    it('goes to the inbox with neither a party nor a dialog', () => {
      expect(inboxHref({})).toBe('https://af.tt02.altinn.no/');
    });

    it('goes to the dialog with a dialog id', () => {
      expect(inboxHref({ dialogId })).toBe(`https://af.tt02.altinn.no/inbox/${dialogId}`);
    });

    it('switches party through access management with a party id', () => {
      expect(inboxHref({ partyId: 12345 })).toBe(
        'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2F',
      );
    });

    it('switches party on the way to the dialog with both', () => {
      const dialogUrl = `https://af.tt02.altinn.no/inbox/${dialogId}`;
      expect(inboxHref({ partyId: 12345, dialogId })).toBe(
        `https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=${encodeURIComponent(
          dialogUrl,
        )}`,
      );
    });

    it('is broken with a party and a dialog when the inbox is not configured', () => {
      window.altinnAppGlobalData.platformFrontendSettings.arbeidsflateInboxUrl = undefined;
      render(
        <PlatformLink
          setting='ArbeidsflateInboxUrl'
          partyId={12345}
          dialogId={dialogId}
        >
          Innboks
        </PlatformLink>,
      );

      expect(screen.getByRole('link', { name: 'Innboks' })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it.each([undefined, ''])('is visibly broken and alerts the missing setting when the setting is %j', (configured) => {
    window.altinnAppGlobalData.platformFrontendSettings.logoutUrl = configured;
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onClick = vi.fn();
    render(
      <PlatformLink
        setting='LogoutUrl'
        className='altinnLink'
        onClick={onClick}
      >
        Logg ut
      </PlatformLink>,
    );
    const link = screen.getByRole('link', { name: 'Logg ut' });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('title', 'PlatformFrontendSettings.LogoutUrl is not configured in this environment');
    expect(link).toHaveAttribute('data-platform-setting', 'LogoutUrl');
    expect(link).toHaveAttribute('href', '#platform-setting-not-configured=LogoutUrl');
    expect(link).toHaveClass('altinnLink');

    expect(fireEvent.click(link)).toBe(false);
    expect(alert).toHaveBeenCalledWith('PlatformFrontendSettings.LogoutUrl is not configured in this environment');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('takes a party or a dialog for the inbox only', () => {
    render(
      // @ts-expect-error: a party is data for the inbox link only
      <PlatformLink
        setting='LogoutUrl'
        partyId={12345}
      >
        Logg ut
      </PlatformLink>,
    );

    expect(screen.getByRole('link', { name: 'Logg ut' })).toHaveAttribute(
      'href',
      'https://platform.tt02.altinn.no/authentication/api/v1/logout',
    );
    expect(screen.getByRole('link', { name: 'Logg ut' })).not.toHaveAttribute('partyid');
  });

  it('gives a text the URL of a setting, or a marker it reads the setting back from', () => {
    expect(platformLinkHref('AllFormsUrl')).toBe('https://tt02.altinn.no/skjemaoversikt');

    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = undefined;
    const marker = platformLinkHref('AllFormsUrl');
    expect(marker).toBe('#platform-setting-not-configured=AllFormsUrl');
    expect(notConfiguredPlatformSetting(marker)).toBe('AllFormsUrl');
    expect(notConfiguredPlatformSetting('https://tt02.altinn.no/skjemaoversikt')).toBe(undefined);
    expect(notConfiguredPlatformSetting('#platform-setting-not-configured=SomethingElse')).toBe(undefined);
    expect(notConfiguredPlatformSetting('#platform-setting-not-configured=ArbeidsflateInboxUrl')).toBe(undefined);
  });

  // The help links live in the built-in texts (`<a href="{0}">`, `[text]({0})`), which the text parser renders
  it.each([
    ['an HTML link', 'instantiate.authorization_error_info_rights', /mer informasjon om roller og rettigheter/i],
    ['a markdown link', 'party_selection.seeing_this_preference', /profilinnstillingene/i],
  ])('renders %s in a text with a missing URL as broken', async (_, id, name) => {
    window.altinnAppGlobalData.textResources!.resources = [];
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <Lang
          id={id}
          params={[platformLinkHref('RolesAndRightsHelpUrl')]}
        />
      ),
    });
    const link = screen.getByRole('link', { name });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(fireEvent.click(link)).toBe(false);
    expect(alert).toHaveBeenCalledWith(platformLinkNotConfiguredMessage('RolesAndRightsHelpUrl'));
  });
});

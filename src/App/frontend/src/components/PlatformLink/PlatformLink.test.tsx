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

  it('is a plain link to a configured URL', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(
      <PlatformLink
        href='https://af.tt02.altinn.no/'
        setting='ArbeidsflateInboxUrl'
        className='altinnLink'
      >
        Innboks
      </PlatformLink>,
    );
    const link = screen.getByRole('link', { name: 'Innboks' });

    expect(link).toHaveAttribute('href', 'https://af.tt02.altinn.no/');
    expect(link).toHaveClass('altinnLink');
    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('title');
    expect(fireEvent.click(link)).toBe(true);
    expect(alert).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])('is visibly broken and alerts the missing setting when the URL is %j', (href) => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onClick = vi.fn();
    render(
      <PlatformLink
        href={href}
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

  it('marks a missing URL in a text resource, and reads the setting back from the marker', () => {
    expect(platformLinkHref('AllFormsUrl', 'https://tt02.altinn.no/skjemaoversikt')).toBe(
      'https://tt02.altinn.no/skjemaoversikt',
    );
    const marker = platformLinkHref('AllFormsUrl', undefined);
    expect(notConfiguredPlatformSetting(marker)).toBe('AllFormsUrl');
    expect(notConfiguredPlatformSetting('https://tt02.altinn.no/skjemaoversikt')).toBe(undefined);
    expect(notConfiguredPlatformSetting('#platform-setting-not-configured=SomethingElse')).toBe(undefined);
  });

  // The help links live in the built-in texts (`<a href="{0}">`, `[text]({0})`), which the text parser renders
  it.each([
    ['an HTML link', 'instantiate.authorization_error_info_rights', /mer informasjon om roller og rettigheter/i],
    ['a markdown link', 'party_selection.seeing_this_preference', /profilinnstillingene/i],
  ])('renders %s in a text with a missing URL as broken', async (_, id, name) => {
    window.altinnAppGlobalData.textResources!.resources = [];
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <Lang
          id={id}
          params={[platformLinkHref('RolesAndRightsHelpUrl', undefined)]}
        />
      ),
    });
    const link = screen.getByRole('link', { name });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(fireEvent.click(link)).toBe(false);
    expect(alert).toHaveBeenCalledWith(platformLinkNotConfiguredMessage('RolesAndRightsHelpUrl'));
  });
});

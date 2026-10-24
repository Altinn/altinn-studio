import React, { forwardRef } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

import cn from 'classnames';

import classes from 'src/components/PlatformLink/PlatformLink.module.css';
import {
  getMessageBoxUrl,
  logoutUrlAltinn,
  returnUrlToAccessManagement,
  returnUrlToAllForms,
  returnUrlToPartiesSettings,
  returnUrlToProfile,
  returnUrlToRolesAndRightsHelp,
} from 'src/utils/urls/urlHelper';

/** The members of the backend's `PlatformFrontendSettings` that the app frontend renders as links. */
export const platformLinkSettings = [
  'ArbeidsflateInboxUrl',
  'ArbeidsflateProfileUrl',
  'ArbeidsflatePartiesUrl',
  'AllFormsUrl',
  'AccessManagementUrl',
  'RolesAndRightsHelpUrl',
  'LogoutUrl',
] as const;

export type PlatformLinkSetting = (typeof platformLinkSettings)[number];

/** The settings whose URL takes no arguments: all but the inbox, which can go to a party or a dialog. */
export type PlainPlatformLinkSetting = Exclude<PlatformLinkSetting, 'ArbeidsflateInboxUrl'>;

/**
 * Which platform page a link goes to: a setting, and for the inbox the party and dialog it opens. Only the inbox takes
 * them, and the type says so: passing a party or dialog to any other link is a compile error, not an argument silently
 * ignored.
 */
export type PlatformLinkTarget =
  | {
      setting: 'ArbeidsflateInboxUrl';
      /** Switch to this party through access management's redirect on the way to the inbox. */
      partyId?: number;
      /** Open this dialog in the inbox (the dialog URL template), else the inbox itself. */
      dialogId?: string;
    }
  | {
      setting: PlainPlatformLinkSetting;
      partyId?: never;
      dialogId?: never;
    };

/**
 * Each setting's URL, through the helpers in `urlHelper` so the template filling and the party switch stay in one
 * place.
 */
const settingUrls: Record<
  PlatformLinkSetting,
  (target: { partyId?: number; dialogId?: string }) => string | undefined
> = {
  ArbeidsflateInboxUrl: ({ partyId, dialogId }) => getMessageBoxUrl(partyId, dialogId),
  ArbeidsflateProfileUrl: returnUrlToProfile,
  ArbeidsflatePartiesUrl: returnUrlToPartiesSettings,
  AllFormsUrl: returnUrlToAllForms,
  AccessManagementUrl: returnUrlToAccessManagement,
  RolesAndRightsHelpUrl: returnUrlToRolesAndRightsHelp,
  LogoutUrl: logoutUrlAltinn,
};

/** The configured URL of a link target, or `undefined` when the environment does not configure it. */
export function platformSettingUrl({ setting, partyId, dialogId }: PlatformLinkTarget): string | undefined {
  return settingUrls[setting]({ partyId, dialogId });
}

export function isPlatformLinkSetting(value: string): value is PlatformLinkSetting {
  return (platformLinkSettings as readonly string[]).includes(value);
}

/**
 * Developer-facing, so a plain string rather than a translated text: it names a configuration key for whoever
 * configures the environment, and a broken link only shows where the platform has not configured one.
 */
export function platformLinkNotConfiguredMessage(setting: PlatformLinkSetting): string {
  return `PlatformFrontendSettings.${setting} is not configured in this environment`;
}

const notConfiguredHrefPrefix = '#platform-setting-not-configured=';

/**
 * The href for a platform link inside a text resource (`<a href="{0}">`, `[text]({0})`), where the link is not a
 * component we render: the setting's configured URL, or a marker the text parser renders as a not-configured
 * {@link PlatformLink}. No text links to a party's inbox or a dialog, so it takes the setting alone.
 */
export function platformLinkHref(setting: PlainPlatformLinkSetting): string {
  return platformSettingUrl({ setting }) || notConfiguredMarker(setting);
}

function notConfiguredMarker(setting: PlatformLinkSetting): string {
  return `${notConfiguredHrefPrefix}${setting}`;
}

/** The setting a {@link platformLinkHref} marker names, or `undefined` for any other href. */
export function notConfiguredPlatformSetting(href: string | undefined): PlainPlatformLinkSetting | undefined {
  if (!href?.startsWith(notConfiguredHrefPrefix)) {
    return undefined;
  }
  const setting = href.slice(notConfiguredHrefPrefix.length);
  return isPlatformLinkSetting(setting) && setting !== 'ArbeidsflateInboxUrl' ? setting : undefined;
}

export type PlatformLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & PlatformLinkTarget;

/**
 * A link to a platform page whose URL comes from `PlatformFrontendSettings`: the `setting`'s, for the inbox with the
 * given party and dialog. The props are data only; the URL is computed here. With a URL it is a plain anchor. Without
 * one it stays in place, visibly broken, so a misconfigured environment is obvious instead of masked: marked
 * `aria-disabled` with a dashed, muted style and a title naming the missing setting, and a click shows that message
 * instead of navigating; its href is then the {@link platformLinkHref} marker, a fragment that goes nowhere.
 *
 * It forwards its ref and props, so it can be the direct child of one design-system `asChild` component (a `Button`);
 * nesting two `asChild` components around it does not slot.
 */
export const PlatformLink = forwardRef<HTMLAnchorElement, PlatformLinkProps>(function PlatformLink(props, ref) {
  // The target props are data for the URL, not attributes of the anchor
  const { setting, partyId: _partyId, dialogId: _dialogId, className, onClick, children, ...rest } = props;
  const href = platformSettingUrl(props);
  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={className}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const message = platformLinkNotConfiguredMessage(setting);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClick?.(event);
    window.alert(message);
  };

  return (
    <a
      ref={ref}
      {...rest}
      href={notConfiguredMarker(setting)}
      target={undefined}
      aria-disabled='true'
      title={message}
      data-platform-setting={setting}
      className={cn(className, classes.notConfigured)}
      onClick={handleClick}
    >
      {children}
    </a>
  );
});

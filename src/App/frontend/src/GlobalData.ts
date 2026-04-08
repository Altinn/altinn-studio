import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFooterLayout } from 'src/features/footer/types';
import type { UiConfig } from 'src/features/form/ui/types';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { OrgName } from 'src/global';
import type { IAppLanguage, IApplicationSettings, IParty, IPlatformFrontendSettings, IProfile } from 'src/types/shared';

/**
 * Static accessor for global application data set on `window` by the host page.
 * Provides a single import point instead of scattered `window.*` accesses.
 */
export class GlobalData {
  static get org(): string {
    return window.org;
  }

  static get app(): string {
    return window.app;
  }

  static get basename(): string {
    return `/${this.org}/${this.app}`;
  }

  static get applicationMetadata(): ApplicationMetadata {
    return window.altinnAppGlobalData.applicationMetadata;
  }

  static get userProfile(): IProfile | undefined {
    return window.altinnAppGlobalData.userProfile;
  }

  private static _selectedPartyOverride: IParty | undefined;

  static getSelectedParty(): IParty | undefined {
    return this._selectedPartyOverride ?? window.altinnAppGlobalData.selectedParty;
  }

  static setSelectedParty(party: IParty | undefined) {
    this._selectedPartyOverride = party;
  }

  static get textResources(): ITextResourceResult | undefined {
    return window.altinnAppGlobalData.textResources;
  }

  static get frontendSettings(): IApplicationSettings {
    return window.altinnAppGlobalData.frontendSettings;
  }

  static get platformFrontendSettings(): IPlatformFrontendSettings {
    return window.altinnAppGlobalData.platformFrontendSettings;
  }

  static get ui(): UiConfig {
    return window.altinnAppGlobalData.ui;
  }

  static get footer(): IFooterLayout {
    return window.altinnAppGlobalData.footer;
  }

  static get availableLanguages(): IAppLanguage[] {
    return window.altinnAppGlobalData.availableLanguages;
  }

  static get orgName(): OrgName | undefined {
    return window.altinnAppGlobalData.orgName;
  }

  static get orgLogoUrl(): string | undefined {
    return window.altinnAppGlobalData.orgLogoUrl;
  }

  static get returnUrl(): string | undefined {
    return window.altinnAppGlobalData.returnUrl;
  }
}

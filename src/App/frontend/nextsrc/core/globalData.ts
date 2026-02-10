import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFooterLayout } from 'src/features/footer/types';
import type { ILayoutSets } from 'src/features/form/layoutSets/types';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { IAppLanguage, IApplicationSettings, IProfile } from 'src/types/shared';

type AltinnAppGlobalData = {
  applicationMetadata: ApplicationMetadata;
  footer: IFooterLayout;
  layoutSets: ILayoutSets;
  frontendSettings: IApplicationSettings;
  availableLanguages: IAppLanguage[];
  userProfile?: IProfile;
  returnUrl?: string;
  textResources?: ITextResourceResult;
};

interface AltinnGlobalWindowData {
  org: string;
  app: string;
  altinnAppGlobalData: AltinnAppGlobalData;
}

export class GlobalData {
  public static get org(): string {
    return GlobalData.typedWindow.org;
  }

  public static get app(): string {
    return GlobalData.typedWindow.app;
  }

  public static get applicationMetadata(): ApplicationMetadata {
    return GlobalData.typedWindow.altinnAppGlobalData.applicationMetadata;
  }

  public static get userProfile(): IProfile | undefined {
    return GlobalData.typedWindow.altinnAppGlobalData.userProfile;
  }

  public static get layoutSets(): ILayoutSets | undefined {
    return GlobalData.typedWindow.altinnAppGlobalData.layoutSets;
  }

  public static get basename(): string {
    return `/${GlobalData.org}/${GlobalData.app}`;
  }

  private static get typedWindow(): AltinnGlobalWindowData {
    return window as unknown as AltinnGlobalWindowData;
  }
}

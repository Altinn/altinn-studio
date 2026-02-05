import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IProfile } from 'src/types/shared';

export type AltinnAppGlobalData = {
  applicationMetadata: ApplicationMetadata;
  userProfile?: IProfile;
};

interface AltinnGlobalWindowData {
  org: string;
  app: string;
  altinnAppGlobalData: AltinnAppGlobalData;
}

export class AltinnGlobalData {
  public static get org() {
    return AltinnGlobalData.typedWindow.org;
  }

  public static get app() {
    return AltinnGlobalData.typedWindow.app;
  }

  public static get applicationMetaData() {
    return AltinnGlobalData.typedWindow.altinnAppGlobalData.applicationMetadata;
  }

  public static get userProfile() {
    return AltinnGlobalData.typedWindow.altinnAppGlobalData.userProfile;
  }

  private static get typedWindow(): AltinnGlobalWindowData {
    return window as unknown as AltinnGlobalWindowData;
  }
}

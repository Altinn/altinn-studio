import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFooterLayout } from 'src/features/footer/types';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IAppLanguage, IApplicationSettings, IInstance, IProcess, IProfile } from 'src/types/shared';

export {};

export type AltinnAppData = {
  instance: IInstance;
  processState: IProcess;
  userProfile: IProfile;
  layoutSets: ILayoutSets;
  applicationMetadata: IncomingApplicationMetadata;
  footerLayout: IFooterLayout | null;
  appLanguages: IAppLanguage[];
  textResources: ITextResourceResult | null;
  frontendSettings: IApplicationSettings;
};
declare global {
  interface Window {
    AltinnAppData: AltinnAppData;
    CreateInstance?: boolean;
  }
}

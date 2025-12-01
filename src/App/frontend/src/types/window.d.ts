import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFooterLayout } from 'src/features/footer/types';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IAppLanguage, IApplicationSettings, IInstance, IProcess, IProfile } from 'src/types/shared';

export {};

// export type AltinnAppData = {
//   instance: IInstance;
//   processState: IProcess;
//   userProfile: IProfile;
//   layoutSets: ILayoutSets;
//   applicationMetadata: ApplicationMetadata;
//   footerLayout: IFooterLayout | null;
//   availableLanguages: IAppLanguage[];
//   textResources: ITextResourceResult;
//   frontendSettings: IApplicationSettings;
// };

export type AltinnAppGlobalData = {
  userProfile: IProfile;
  applicationMetadata: ApplicationMetadata;
  footerLayout: IFooterLayout | null;
  availableLanguages: IAppLanguage[];
  frontendSettings: IApplicationSettings;
};

export type AltinnAppInstanceData = {
  instance: IInstance;
  processState: IProcess;
  layoutSets: ILayoutSets;
  applicationMetadata: ApplicationMetadata;
  footerLayout: IFooterLayout | null;
  availableLanguages: IAppLanguage[];
  textResources: ITextResourceResult;
  frontendSettings: IApplicationSettings;
};

declare global {
  interface Window {
    AltinnAppGlobalData: AltinnAppGlobalData;
    AltinnAppInstanceData?: AltinnAppInstanceData;
  }
}

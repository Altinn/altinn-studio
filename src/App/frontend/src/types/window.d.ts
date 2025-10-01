import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFooterLayout } from 'src/features/footer/types';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IAppLanguage, IInstance, IProcess, IProfile } from 'src/types/shared';

export {};

declare global {
  interface Window {
    AltinnAppData: {
      instance: IInstance;
      processState: IProcess;
      userProfile: IProfile;
      layoutSets: ILayoutSets;
      applicationMetadata: IncomingApplicationMetadata;
      footerLayout: IFooterLayout | null;
      appLanguages: IAppLanguage[];
      textResources: ITextResourceResult | null;
    };
  }
}

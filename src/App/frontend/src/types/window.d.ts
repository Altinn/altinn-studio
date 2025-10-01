import type { ILayoutSets } from 'src/layout/common.generated';
import type { IInstance, IProcess, IProfile } from 'src/types/shared';

export {};

declare global {
  interface Window {
    AltinnAppData: {
      instance: IInstance;
      processState: IProcess;
      userProfile: IProfile;
      layoutSets: ILayoutSets;
      // Define your initial app state structure here
    };
  }
}

import type { IInstance, IProcess, IProfile } from 'src/types/shared';

export {};

declare global {
  interface Window {
    AltinnAppData: {
      instance: IInstance;
      processState: IProcess;
      userProfile: IProfile;
      // Define your initial app state structure here
    };
  }
}

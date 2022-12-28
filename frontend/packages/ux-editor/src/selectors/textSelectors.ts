import type { IAppState } from '../types/global';

export const textSelector = (state: IAppState) => state.appData.languageState.language;

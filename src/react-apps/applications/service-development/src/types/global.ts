import { IHandleServiceInformationState } from '../features/administration/handleServiceInformationReducer';
import { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1, T2, T3> {
    language: T1;
    handleMergeConflict: T2;
    serviceInformation: T3;
  }

  export interface IServiceDevelopmentState
    extends IServiceDevelopmentNameSpace
    <IFetchedLanguageState,
    IHandleMergeConflictState,
    IHandleServiceInformationState> { }
}

export interface ICommit {
  message: string;
  author: ICommitAuthor;
  commiter: ICommitAuthor;
  sha: string;
  messageShort: string;
  ecoding: string;
}

export interface ICommitAuthor {
  email: string;
  name: string;
  when: any;
}

export interface IServiceName {
  name: string;
  saving: boolean;
}

export interface IServiceDescription {
  description: string;
  saving: boolean;
}

import { TextResourceVariable } from '@altinn/text-editor/src/types';

export interface IFrontEndSettings {
  appUrl?: string;
}

export interface ILayoutSettings {
  $schema?: string;
  pages?: IPagesSettings;
  components?: IComponentsSettings;
  receiptLayoutName?: string;
}

export interface IPagesSettings {
  order?: string[];
  excludeFromPdf?: string[];
}

export interface IComponentsSettings {
  excludeFromPdf?: string[];
}

export enum RepositoryType {
  App = 'App',
  Datamodels = 'Datamodels',
  Unknown = 'Unknown',
}

export interface IGiteaOrganisation {
  avatar_url: string;
  description?: string;
  id: number;
  location?: string;
  username: string;
  website?: string;
  full_name?: string;
}

export interface IContentStatus {
  filePath: string;
  fileStatus: string;
}

export interface IGitStatus {
  behindBy: number;
  aheadBy: number;
  contentStatus: IContentStatus[];
  repositoryStatus: string;
  hasMergeConflict: boolean;
}

export interface ITextResources {
  [langCode: string]: ITextResource[];
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue?: string;
  variables?: TextResourceVariable[];
}

export interface ITextResourcesObjectFormat {
  [key: string]: string;
}

export interface ITextResourcesWithLanguage {
  language: string;
  resources: ITextResource[];
}

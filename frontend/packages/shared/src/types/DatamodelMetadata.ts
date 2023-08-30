type DatamodelFileType = '.xsd' | '.json';

export type DatamodelMetadata<T extends DatamodelFileType = DatamodelFileType> = {
  description: string | null;
  directory: string;
  fileName: string;
  filePath: string;
  fileStatus: string;
  fileType: T;
  lastChanged: string;
  repositoryRelativeUrl: string;
  select?: boolean;
};

export type DatamodelMetadataXsd = DatamodelMetadata<'.xsd'>;
export type DatamodelMetadataJson = DatamodelMetadata<'.json'>;

type DataModelFileType = '.xsd' | '.json';

export type DataModelMetadata<T extends DataModelFileType = DataModelFileType> = {
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

export type DataModelMetadataXsd = DataModelMetadata<'.xsd'>;
export type DataModelMetadataJson = DataModelMetadata<'.json'>;

import type {
  DataModelMetadataJson,
  DataModelMetadataXsd,
} from 'app-shared/types/DataModelMetadata';

export const dataModel1NameMock = 'dataModel1';
export const dataModel2NameMock = 'dataModel2';
const description = null;
const directory = 'test/test';
const fileStatus = 'Default';
const lastChanged = '2021-09-09T12:00:00';
const metadataMockBase = {
  description,
  directory,
  fileStatus,
  lastChanged,
};
export const jsonMetadata1Mock: DataModelMetadataJson = {
  ...metadataMockBase,
  fileName: `${dataModel1NameMock}.schema.json`,
  filePath: `${directory}/${dataModel1NameMock}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: `/App/models/${dataModel1NameMock}.schema.json`,
};
export const jsonMetadata2Mock: DataModelMetadataJson = {
  ...metadataMockBase,
  fileName: `${dataModel2NameMock}.schema.json`,
  filePath: `${directory}/${dataModel2NameMock}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: `/App/models/${dataModel2NameMock}.schema.json`,
};
export const xsdMetadata1Mock: DataModelMetadataXsd = {
  ...metadataMockBase,
  fileName: `${dataModel1NameMock}.xsd`,
  filePath: `${directory}/${dataModel1NameMock}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: `/App/models/${dataModel1NameMock}.xsd`,
};
export const xsdMetadata2Mock: DataModelMetadataXsd = {
  ...metadataMockBase,
  fileName: `${dataModel2NameMock}.xsd`,
  filePath: `${directory}/${dataModel2NameMock}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: `/App/models/${dataModel2NameMock}.xsd`,
};

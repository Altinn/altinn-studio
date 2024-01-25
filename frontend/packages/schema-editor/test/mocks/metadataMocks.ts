import type {
  DatamodelMetadataJson,
  DatamodelMetadataXsd,
} from 'app-shared/types/DatamodelMetadata';

export const datamodel1NameMock = 'datamodel1';
export const datamodel2NameMock = 'datamodel2';
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
export const jsonMetadata1Mock: DatamodelMetadataJson = {
  ...metadataMockBase,
  fileName: `${datamodel1NameMock}.schema.json`,
  filePath: `${directory}/${datamodel1NameMock}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: `/App/models/${datamodel1NameMock}.schema.json`,
};
export const jsonMetadata2Mock: DatamodelMetadataJson = {
  ...metadataMockBase,
  fileName: `${datamodel2NameMock}.schema.json`,
  filePath: `${directory}/${datamodel2NameMock}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: `/App/models/${datamodel2NameMock}.schema.json`,
};
export const xsdMetadata1Mock: DatamodelMetadataXsd = {
  ...metadataMockBase,
  fileName: `${datamodel1NameMock}.xsd`,
  filePath: `${directory}/${datamodel1NameMock}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: `/App/models/${datamodel1NameMock}.xsd`,
};
export const xsdMetadata2Mock: DatamodelMetadataXsd = {
  ...metadataMockBase,
  fileName: `${datamodel2NameMock}.xsd`,
  filePath: `${directory}/${datamodel2NameMock}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: `/App/models/${datamodel2NameMock}.xsd`,
};

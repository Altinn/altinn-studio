import type {
  DatamodelMetadataJson,
  DatamodelMetadataXsd,
} from 'app-shared/types/DatamodelMetadata';

export const datamodelNameMock = 'model1';
const description = null;
const directory = 'bla/bla/bla';
const fileStatus = 'Default';
const lastChanged = '2020-09-09T12:00:00';
const metadataMockBase = {
  description,
  directory,
  fileStatus,
  lastChanged,
};

export const jsonMetadataMock: DatamodelMetadataJson = {
  ...metadataMockBase,
  fileName: `${datamodelNameMock}.schema.json`,
  filePath: `${directory}/${datamodelNameMock}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: `/App/models/${datamodelNameMock}.schema.json`,
};

export const xsdMetadataMock: DatamodelMetadataXsd = {
  ...metadataMockBase,
  fileName: `${datamodelNameMock}.xsd`,
  filePath: `${directory}/${datamodelNameMock}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: `/App/models/${datamodelNameMock}.xsd`,
};

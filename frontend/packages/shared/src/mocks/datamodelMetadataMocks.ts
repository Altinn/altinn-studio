import type {
  DatamodelMetadataJson,
  DatamodelMetadataXsd,
} from 'app-shared/types/DatamodelMetadata';
import { createJsonModelPathMock, createXsdModelPathMock } from 'app-shared/mocks/modelPathMocks';

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

export const createJsonMetadataMock = (modelName: string): DatamodelMetadataJson => ({
  ...metadataMockBase,
  fileName: `${modelName}.schema.json`,
  filePath: `${directory}/${modelName}.schema.json`,
  fileType: '.json',
  repositoryRelativeUrl: createJsonModelPathMock(modelName),
});

export const createXsdMetadataMock = (modelName: string): DatamodelMetadataXsd => ({
  ...metadataMockBase,
  fileName: `${modelName}.xsd`,
  filePath: `${directory}/${modelName}.xsd`,
  fileType: '.xsd',
  repositoryRelativeUrl: createXsdModelPathMock(modelName),
});

export const jsonMetadataMock: DatamodelMetadataJson = createJsonMetadataMock(datamodelNameMock);
export const xsdMetadataMock: DatamodelMetadataXsd = createXsdMetadataMock(datamodelNameMock);

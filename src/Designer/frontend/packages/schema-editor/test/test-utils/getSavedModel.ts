import type { SchemaModel } from '@altinn/schema-model/index';

/**
 * Get the saved model from the saveDataModel mock.
 * @param saveDataModelMock The mocked saveDataModel function that has been called with the model to find.
 * @param callIndex The index of the call to get the saved model from. Defaults to 0.
 * @returns The UiSchemaNodes model that the saveDataModel mock has been called with.
 */
export const getSavedModel = (saveDataModelMock: jest.Mock, callIndex: number = 0): SchemaModel =>
  saveDataModelMock.mock.calls[callIndex][0];

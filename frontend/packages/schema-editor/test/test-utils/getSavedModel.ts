import { SchemaModel } from '@altinn/schema-model';

/**
 * Get the saved model from the saveDatamodel mock.
 * @param saveDatamodelMock The mocked saveDatamodel function that has been called with the model to find.
 * @param callIndex The index of the call to get the saved model from. Defaults to 0.
 * @returns The UiSchemaNodes model that the saveDatamodel mock has been called with.
 */
export const getSavedModel = (saveDatamodelMock: jest.Mock, callIndex: number = 0): SchemaModel =>
  saveDatamodelMock.mock.calls[callIndex][0];

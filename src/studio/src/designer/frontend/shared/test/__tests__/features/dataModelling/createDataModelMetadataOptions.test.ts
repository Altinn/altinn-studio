import 'jest';
import createDataModelMetadataOptions from '../../../../features/dataModelling/functions/createDataModelMetadataOptions';
import { IDataModelsMetadataState, LoadingState } from '../../../../features/dataModelling/sagas/metadata';

describe('>>> createDataModelMetadataOptions.ts', () => {
  const dataModelsMetadataState: IDataModelsMetadataState = {
    dataModelsMetadata: [],
    loadState: LoadingState.Idle,
  };
  const state = {
    dataModelsMetadataState,
  };

  it('should return empty if no metadata is set', () => {
    expect(createDataModelMetadataOptions(state)).toHaveLength(0);
  });

  describe('with data', () => {
    beforeEach(() => {
      state.dataModelsMetadataState.dataModelsMetadata = [
        {
          fileName: `first-schema.schema.json`,
          repositoryRelativeUrl: '',
        },
        {
          fileName: `second-schema.schema.json`,
          repositoryRelativeUrl: '',
        },
        {
          fileName: `third-schema.schema.json`,
          repositoryRelativeUrl: '',
        },
        {
          fileName: `fourth-schema.schema.json`,
          repositoryRelativeUrl: '',
        },
        {
          fileName: `fifth-schema.schema.json`,
          repositoryRelativeUrl: '',
        },
      ];
    });

    it('creates expected options out of the provided metadata', () => {
      const options = createDataModelMetadataOptions(state);
      expect(options).toHaveLength(5);
      expect(options[0].label).toBe('first-schema');
      expect(options[4].label).toBe('fifth-schema');
      expect(options[4].value.fileName).toBe('fifth-schema.schema.json');
    });
  });
});

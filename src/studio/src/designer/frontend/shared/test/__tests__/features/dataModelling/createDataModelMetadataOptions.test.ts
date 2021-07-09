import 'jest';
import createDataModelMetadataOptions
  from '../../../../features/dataModelling/functions/createDataModelMetadataOptions';

describe('>>> createDataModelMetadataOptions.ts', () => {
  const dataModelsMetadata: any = [];
  const state = {
    dataModelsMetadataState: {
      dataModelsMetadata,
    },
  };
  it('should return null if no metadata is set', () => {
    expect(createDataModelMetadataOptions(state)).toBeNull();
  });
  describe('with data', () => {
    beforeEach(() => {
      state.dataModelsMetadataState.dataModelsMetadata = [
        {
          fileName: `first-schema.schema.json`,
        },
        {
          fileName: `second-schema.schema.json`,
        },
        {
          fileName: `third-schema.schema.json`,
        },
        {
          fileName: `fourth-schema.schema.json`,
        },
        {
          fileName: `fifth-schema.schema.json`,
        },
      ];
    });
    it('creates expected options out of the provided metadata', () => {
      const options = createDataModelMetadataOptions(state);
      expect(options)
        .toHaveLength(5);
      expect(options[0].label)
        .toBe('first-schema');
      expect(options[4].label)
        .toBe('fifth-schema');
      expect(options[4].value.fileName)
        .toBe('fifth-schema.schema.json');
    });
  });
});

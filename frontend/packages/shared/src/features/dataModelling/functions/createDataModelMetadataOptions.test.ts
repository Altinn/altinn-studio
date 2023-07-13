import { createDataModelMetadataOptions } from './createDataModelMetadataOptions';
import { LoadingState } from '../sagas/metadata';
import { RootState } from 'app-development/store';
import { rootStateMock } from 'app-development/test/rootStateMock';

describe('createDataModelMetadataOptions', () => {
  const state: RootState = {
    ...rootStateMock,
  };
  const stateWithData: RootState = {
    ...rootStateMock,
    dataModelsMetadataState: {
      dataModelsMetadata: [
        {
          fileName: `first-schema.schema.json`,
          fileType: '.json',
          repositoryRelativeUrl: '',
        },
        {
          fileName: `second-schema.schema.json`,
          fileType: '.json',
          repositoryRelativeUrl: '',
        },
        {
          fileName: `third-schema.schema.json`,
          fileType: '.json',
          repositoryRelativeUrl: '',
        },
        {
          fileName: `fourth-schema.schema.json`,
          fileType: '.json',
          repositoryRelativeUrl: '',
        },
        {
          fileName: `fifth-schema.schema.json`,
          fileType: '.json',
          repositoryRelativeUrl: '',
        },
        {
          fileName: `sixth-schema.xsd`,
          fileType: '.xsd',
          repositoryRelativeUrl: '',
        },
      ],
      loadState: LoadingState.Idle,
    }
  };

  it('should return empty if no metadata is set', () => {
    const result = createDataModelMetadataOptions(state);
    expect(result).toHaveLength(2);
    expect(result[0].options).toHaveLength(0);
    expect(result[1].options).toHaveLength(0);
  });

  describe('with data', () => {
    it('creates expected options out of the provided metadata', () => {
      const options = createDataModelMetadataOptions(stateWithData);
      expect(options).toHaveLength(2);
      const [jsonOptions, xsdOptions] = options;

      expect(jsonOptions.options).toHaveLength(5);
      expect(jsonOptions.options[0].label).toBe('first-schema');
      expect(jsonOptions.options[0].value.fileType).toBe('.json');
      expect(jsonOptions.options[4].label).toBe('fifth-schema');
      expect(jsonOptions.options[4].value.fileName).toBe('fifth-schema.schema.json');

      expect(xsdOptions.options).toHaveLength(1);
      expect(xsdOptions.options[0].label).toBe('sixth-schema  (XSD)');
      expect(xsdOptions.options[0].value.fileType).toBe('.xsd');
    });
  });
});

import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../testing/componentMocks';
import {
  convertDataBindingToInternalFormat,
  getDataModel,
  getDataModelFields,
  getMaxOccursFromDataModelFields,
  getMinOccursFromDataModelFields,
  getXsdDataTypeFromDataModelFields,
  validateSelectedDataField,
  validateSelectedDataModel,
} from './dataModelUtils';
import { dataModelMetadataMock } from '@altinn/ux-editor/testing/dataModelMock';

describe('getMinOccursFromDataModelFields', () => {
  it('should be truthy if minOccurs is bigger than 0', () => {
    const selectedDataField = 'field1';
    const minOccurs = getMinOccursFromDataModelFields(selectedDataField, dataModelMetadataMock);
    expect(minOccurs).toBeTruthy();
  });

  it('should be undefined if minOccurs is set to 0 or not defined', () => {
    const testDataModelMetadataMock = [...dataModelMetadataMock];
    testDataModelMetadataMock[1] = {
      ...testDataModelMetadataMock[1],
      minOccurs: 0,
    };
    testDataModelMetadataMock[2] = {
      ...testDataModelMetadataMock[2],
      minOccurs: undefined,
    };

    const selectedDataField1 = 'field1';
    const minOccurs1 = getMinOccursFromDataModelFields(
      selectedDataField1,
      testDataModelMetadataMock,
    );
    expect(minOccurs1).toBeUndefined();

    const selectedDataField2 = 'field2';
    const minOccurs2 = getMinOccursFromDataModelFields(
      selectedDataField2,
      testDataModelMetadataMock,
    );
    expect(minOccurs2).toBeUndefined();
  });
});

describe('getMaxOccursFromDataModelFields', () => {
  it('should return max number of occurrences when component is a repeatingGroup', () => {
    const selectedDataField = 'field1';

    const testDataModelMetadataMock = [...dataModelMetadataMock];
    testDataModelMetadataMock[1] = {
      ...testDataModelMetadataMock[1],
      maxOccurs: 3,
    };
    const maxOccurs = getMaxOccursFromDataModelFields(
      ComponentType.RepeatingGroup,
      selectedDataField,
      testDataModelMetadataMock,
    );
    expect(maxOccurs).toEqual(3);
  });

  it('should return undefined when component is not a repeatingGroup', () => {
    const selectedDataField = 'field2';

    const maxOccurs = getMaxOccursFromDataModelFields(
      ComponentType.Input,
      selectedDataField,
      dataModelMetadataMock,
    );
    expect(maxOccurs).toEqual(undefined);
  });
});

describe('getXsdDataTypeFromDataModelFields', () => {
  it('should return "DateTime" when selected data model field is a datepicker', () => {
    const selectedDataField = 'datePickerField';
    const xsdDataType = getXsdDataTypeFromDataModelFields(
      ComponentType.Datepicker,
      selectedDataField,
      dataModelMetadataMock,
    );
    expect(xsdDataType).toEqual('DateTime');
  });

  it('should return undefined when selected data model field is not a datepicker', () => {
    const selectedDataField = 'field1';
    const xsdDataType = getXsdDataTypeFromDataModelFields(
      ComponentType.Input,
      selectedDataField,
      dataModelMetadataMock,
    );
    expect(xsdDataType).toEqual(undefined);
  });

  it('should return undefined when selected data model field is a datepicker but xsd value type is not "DateTime"', () => {
    const selectedDataField = 'datePickerField';
    const testDataModelMetadataMock = [...dataModelMetadataMock];
    testDataModelMetadataMock[3] = {
      ...testDataModelMetadataMock[3],
      xsdValueType: 'SomethingElse',
    };
    const xsdDataType = getXsdDataTypeFromDataModelFields(
      ComponentType.Datepicker,
      selectedDataField,
      testDataModelMetadataMock,
    );
    expect(xsdDataType).toEqual(undefined);
  });
});

describe('getDataModelFields', () => {
  const componentType = ComponentType.Input;
  const bindingKey = 'simpleBinding';
  const dataModelMetadata = dataModelMetadataMock;

  it('should return data model fields when dataModelMetadata is defined', () => {
    const dataModelFields = getDataModelFields({
      componentType,
      bindingKey,
      dataModelMetadata,
    });

    expect(dataModelFields).toEqual([
      { value: 'field1', label: 'field1' },
      { value: 'field2', label: 'field2' },
      { value: 'datePickerField', label: 'datePickerField' },
    ]);
  });

  it('should return empty array when dataModelMetadata is undefined', () => {
    const dataModelFields = getDataModelFields({
      componentType,
      bindingKey,
      dataModelMetadata: undefined,
    });
    expect(dataModelFields).toEqual([]);
  });
});

describe('convertDataBindingToInternalFormat', () => {
  const testComponent = componentMocks[ComponentType.Input];

  it('should return internal format when it already has internal format', () => {
    const component = {
      ...testComponent,
      dataModelBindings: {
        simpleBinding: {
          dataType: 'dataType',
          field: 'field',
        },
      },
    };
    const bindingKey = 'simpleBinding';
    const internalFormat = convertDataBindingToInternalFormat(
      'testDataType',
      component.dataModelBindings[bindingKey],
    );
    expect(internalFormat).toEqual({ dataType: 'dataType', field: 'field' });
  });

  it('should return correct format when it has old format', () => {
    const bindingKey = 'simpleBinding';
    const internalFormat = convertDataBindingToInternalFormat(
      '',
      testComponent.dataModelBindings[bindingKey],
    );
    expect(internalFormat).toEqual({ dataType: '', field: '' });
  });

  it('should return correct format when dataModelBindings and bindingKey is not defined', () => {
    const internalFormat = convertDataBindingToInternalFormat('', undefined);
    expect(internalFormat).toEqual({ dataType: '', field: '' });
  });
});

describe('validateSelectedDataModel', () => {
  const dataModels = ['model1', 'model2'];

  it('should return true when selected data model exist', () => {
    const selectedDataModel = 'model2';
    const isValid = validateSelectedDataModel(selectedDataModel, dataModels);
    expect(isValid).toBeTruthy();
  });

  it('should return false when selected data model does no longer exist', () => {
    const selectedDataModel = 'model3';
    const isValid = validateSelectedDataModel(selectedDataModel, dataModels);
    expect(isValid).toBeFalsy();
  });

  it('should return true when selected data model is not defined', () => {
    const selectedDataModel = undefined;
    const isValid = validateSelectedDataModel(selectedDataModel, dataModels);
    expect(isValid).toBeTruthy();
  });
});

describe('validateSelectedDataField', () => {
  const dataModelFields = [
    {
      value: 'field1',
      label: 'field1',
    },
    {
      value: 'field2',
      label: 'field2',
    },
    {
      value: 'datePickerField',
      label: 'datePickerField',
    },
  ];

  it('should return true when selected data model field is valid', () => {
    const selectedDataField = 'field2';
    const isValid = validateSelectedDataField(selectedDataField, dataModelFields);
    expect(isValid).toBeTruthy();
  });

  it('should return false when selected data model field is invalid', () => {
    const selectedDataField = 'field3';
    const isValid = validateSelectedDataField(selectedDataField, dataModelFields);
    expect(isValid).toBeFalsy();
  });

  it('should return true when selected data model field is not defined', () => {
    const selectedDataField = undefined;
    const isValid = validateSelectedDataField(selectedDataField, dataModelFields);
    expect(isValid).toBeTruthy();
  });

  it('should return true when selected data model field is empty string', () => {
    const selectedDataField = '';
    const isValid = validateSelectedDataField(selectedDataField, dataModelFields);
    expect(isValid).toBeTruthy();
  });
});

describe('getDataModel', () => {
  const defaultModel = dataModelMetadataMock[0].id;

  it('should return default data model when it is defined but invalid', () => {
    const isDataModelValid = false;
    const currentDataModel = 'currentDataModel';

    const dataModel = getDataModel(isDataModelValid, defaultModel, currentDataModel);
    expect(dataModel).toEqual(defaultModel);
  });

  it('should return default data model when it is undefined and invalid', () => {
    const isDataModelValid = false;
    const currentDataModel = undefined;

    const dataModel = getDataModel(isDataModelValid, defaultModel, currentDataModel);
    expect(dataModel).toEqual(defaultModel);
  });

  it('should return current data model when it is defined and valid', () => {
    const isDataModelValid = true;
    const currentDataModel = 'currentDataModel';

    const dataModel = getDataModel(isDataModelValid, defaultModel, currentDataModel);
    expect(dataModel).toEqual(currentDataModel);
  });

  it('should return current data model if metadata is undefined', () => {
    const isDataModelValid = true;
    const currentDataModel = 'currentDataModel';

    const dataModel = getDataModel(isDataModelValid, defaultModel, currentDataModel);
    expect(dataModel).toEqual(currentDataModel);
  });

  it('should return default data model if current data model is empty string', () => {
    const isDataModelValid = true;
    const currentDataModel = '';

    const dataModel = getDataModel(isDataModelValid, defaultModel, currentDataModel);
    expect(dataModel).toEqual(defaultModel);
  });
});

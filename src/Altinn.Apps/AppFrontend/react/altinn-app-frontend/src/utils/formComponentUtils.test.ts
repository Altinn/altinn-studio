import {
  getDisplayFormData,
  getFormDataForComponentInRepeatingGroup,
  componentValidationsHandledByGenericComponent,
  selectComponentTexts,
  isComponentValid,
} from './formComponentUtils';
import { IOptions, ITextResource } from '../types';
import { IFormData } from '../features/form/data/formDataReducer';
import {
  ILayoutComponent,
  ISelectionComponentProps,
} from '../features/form/layout';
import ReactHtmlParser from 'react-html-parser';
import { removeStyling } from 'altinn-shared/utils/language';

describe('utils/formComponentUtils', () => {
  const mockFormData: IFormData = {
    mockBindingInput: 'test',
    mockBindingCheckbox: 'optionValue1,optionValue2',
    'group[0].checkbox': 'repOptionValue1,repOptionValue2,repOptionValue3',
  };
  const mockTextResources: ITextResource[] = [
    {
      id: 'textKey1',
      value: 'Value1',
    },
    {
      id: 'textKey2',
      value: 'Value2',
    },
    {
      id: 'repTextKey1',
      value: 'RepValue1',
    },
    {
      id: 'repTextKey2',
      value: 'RepValue2',
    },
    {
      id: 'repTextKey3',
      value: 'RepValue3',
    },
  ];
  const mockOptions: IOptions = {
    mockOption: [
      { value: 'optionValue1', label: 'textKey1' },
      { value: 'optionValue2', label: 'textKey2' },
    ],
    mockRepOption: [
      { value: 'repOptionValue1', label: 'repTextKey1' },
      { value: 'repOptionValue2', label: 'repTextKey2' },
      { value: 'repOptionValue3', label: 'repTextKey3' },
    ],
  };

  describe('getDisplayFormData', () => {
    it('should return form data for a component', () => {
      const inputComponent = {
        type: 'Input',
      } as ILayoutComponent;
      const result = getDisplayFormData(
        'mockBindingInput',
        inputComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('test');
    });

    it('should return comma separated string of text resources for checkboxes with multiple values', () => {
      const checkboxComponent = {
        type: 'Checkboxes',
        optionsId: 'mockOption',
      } as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingCheckbox',
        checkboxComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value1, Value2');
    });

    it('should return object with text resources for checkboxes with multiple values when asObject parameter is true', () => {
      const checkboxComponent = {
        type: 'Checkboxes',
        optionsId: 'mockOption',
      } as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingCheckbox',
        checkboxComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
        true,
      );
      const expected = {
        optionValue1: 'Value1',
        optionValue2: 'Value2',
      };
      expect(result).toEqual(expected);
    });
  });

  describe('componentValidationsHandledByGenericComponent', () => {
    it(' should return false when dataModelBinding is undefined', () => {
      const genericComponent = {
        type: 'FileUpload',
      };
      const result = componentValidationsHandledByGenericComponent(
        undefined,
        genericComponent.type,
      );
      expect(result).toEqual(false);
    });

    it(' should return false when component type is Datepicker', () => {
      const genericComponent = {
        type: 'Datepicker',
        dataModelBindings: {
          simpleBinding: 'group.superdate',
        },
      };
      const result = componentValidationsHandledByGenericComponent(
        genericComponent.dataModelBindings,
        genericComponent.type,
      );
      expect(result).toEqual(false);
    });

    it(' should return true when component type is Input', () => {
      const genericComponent = {
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'group.secretnumber',
        },
      };
      const result = componentValidationsHandledByGenericComponent(
        genericComponent.dataModelBindings,
        genericComponent.type,
      );
      expect(result).toEqual(true);
    });
  });

  describe('getFormDataForComponentInRepeatingGroup', () => {
    it('should return comma separated string of text resources for checkboxes with mulitiple values', () => {
      const checkboxComponent = {
        type: 'Checkboxes',
        optionsId: 'mockRepOption',
        dataModelBindings: {
          simpleBinding: 'group.checkbox',
        },
      } as unknown as ISelectionComponentProps;
      const result = getFormDataForComponentInRepeatingGroup(
        mockFormData,
        checkboxComponent,
        0,
        'group',
        mockTextResources,
        mockOptions,
      );
      expect(result).toEqual('RepValue1, RepValue2, RepValue3');
    });
  });

  describe('selectComponentTexts', () => {
    it('should return value of mapped textResourceBinding', () => {
      const textResourceBindings = {
        title: 'textKey2',
      };
      const result = selectComponentTexts(
        mockTextResources,
        textResourceBindings,
      );

      expect(result).toEqual({
        title: ReactHtmlParser(`<p>Value2</p>`, {
          transform: removeStyling,
        })[0],
      });
    });

    it('should return empty object when no textResourceBindings are provided', () => {
      const result = selectComponentTexts(mockTextResources, undefined);

      expect(result).toEqual({});
    });

    it('should return original key when textResourceBinding key is not found in textResources', () => {
      const textResourceBindings = {
        title: 'key-that-does-not-exist',
      };
      const result = selectComponentTexts(
        mockTextResources,
        textResourceBindings,
      );

      expect(result).toEqual({
        title: 'key-that-does-not-exist',
      });
    });
  });

  describe('isComponentValid', () => {
    it('should return false when validations has errors', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: ['has error'],
          warnings: [],
        },
      });

      expect(result).toBe(false);
    });

    it('should return false when validations has errors and warnings', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: ['has error'],
          warnings: ['has warning'],
        },
      });

      expect(result).toBe(false);
    });

    it('should return true when validations has warnings', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: [],
          warnings: ['has warnings'],
        },
      });

      expect(result).toBe(true);
    });

    it('should return true when validations has no warnings or errors', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: [],
          warnings: [],
        },
      });

      expect(result).toBe(true);
    });
  });
});

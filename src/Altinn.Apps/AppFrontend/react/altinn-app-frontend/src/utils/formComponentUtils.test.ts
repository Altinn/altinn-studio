import parseHtmlToReact from 'html-react-parser';

import type { IOptions, ITextResource } from 'src/types';
import type { IFormData } from 'src/features/form/data/formDataReducer';
import type {
  ILayoutComponent,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type { IAttachment } from 'src/shared/resources/attachments';

import { parseOptions } from 'altinn-shared/utils/language';

import {
  atleastOneTagExists,
  getDisplayFormData,
  getFormDataForComponentInRepeatingGroup,
  isAttachmentError,
  selectComponentTexts,
  isNotAttachmentError,
  isComponentValid,
  componentValidationsHandledByGenericComponent,
} from './formComponentUtils';

describe('formComponentUtils', () => {
  const mockFormData: IFormData = {
    mockBindingInput: 'test',
    mockBindingCheckbox: 'optionValue1,optionValue2',
    'group[0].checkbox': 'repOptionValue1,repOptionValue2,repOptionValue3',
    mockBindingCheckboxWithMapping:
      'mockOptionsWithMapping1,mockOptionsWithMapping2',
    mockBindingDropdown: 'optionValue1',
    mockBindingDropdownWithMapping: 'mockOptionsWithMapping1',
    mockBindingRadioButtons: 'optionValue1',
    mockBindingRadioButtonsWithMapping: 'mockOptionsWithMapping1',
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
    mockOption: {
      id: 'mockOption',
      options: [
        { value: 'optionValue1', label: 'textKey1' },
        { value: 'optionValue2', label: 'textKey2' },
      ],
    },
    mockRepOption: {
      id: 'mockRepOption',
      options: [
        { value: 'repOptionValue1', label: 'repTextKey1' },
        { value: 'repOptionValue2', label: 'repTextKey2' },
        { value: 'repOptionValue3', label: 'repTextKey3' },
      ],
    },
    '{"id":"mockOptionsWithMapping","mapping":{"someDataField":"someUrlParam"}}':
      {
        id: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
        options: [
          { value: 'mockOptionsWithMapping1', label: 'Value Mapping 1' },
          { value: 'mockOptionsWithMapping2', label: 'Value Mapping 2' },
        ],
      },
  };
  const mockAttachments: IAttachment[] = [
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: ['mockTag'],
      id: '12345',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '123456',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: null,
      id: '123457',
    },
  ];
  const mockAttachmentsWithoutTag: IAttachment[] = [
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '12345',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '123456',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: null,
      id: '123457',
    },
  ];

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

    it('should return comma separated string of text resources for checkboxes with multiple values and mapping', () => {
      const checkboxComponent = {
        type: 'Checkboxes',
        optionsId: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
      } as unknown as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingCheckboxWithMapping',
        checkboxComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value Mapping 1, Value Mapping 2');
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

    it('should return text resource for dropdown component', () => {
      const dropdownComponent = {
        type: 'Dropdown',
        optionsId: 'mockOption',
      } as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingDropdown',
        dropdownComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value1');
    });

    it('should return text resource for dropdown component with mapping', () => {
      const checkboxComponent = {
        type: 'Dropdown',
        optionsId: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
      } as unknown as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingDropdownWithMapping',
        checkboxComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value Mapping 1');
    });

    it('should return text resource for radio button component', () => {
      const radioButtonComponent = {
        type: 'RadioButtons',
        optionsId: 'mockOption',
      } as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingRadioButtons',
        radioButtonComponent,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value1');
    });

    it('should return text resource for radio button component with mapping', () => {
      const radioButtonComponentWithMapping = {
        type: 'RadioButtons',
        optionsId: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
      } as unknown as ISelectionComponentProps;
      const result = getDisplayFormData(
        'mockBindingRadioButtonsWithMapping',
        radioButtonComponentWithMapping,
        mockFormData,
        mockOptions,
        mockTextResources,
      );
      expect(result).toEqual('Value Mapping 1');
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
        title: parseHtmlToReact(`<span>Value2</span>`, parseOptions),
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

  describe('isAttachmentError', () => {
    it('should return true when error has attachmentId', () => {
      const error = {
        id: 'mockUUID',
        message: 'mockMessage',
      };
      const result = isAttachmentError(error);
      expect(result).toEqual(true);
    });

    it('should return false when error does not have attachmentId', () => {
      const error = {
        id: null,
        message: 'mockMessage',
      };
      const result = isAttachmentError(error);
      expect(result).toEqual(false);
    });
  });

  describe('isNotAttachmentError', () => {
    it('should return true when error does not have attachmentId', () => {
      const error = {
        id: null,
        message: 'mockMessage',
      };
      const result = isNotAttachmentError(error);
      expect(result).toEqual(true);
    });

    it('should return false when error has attachmentId', () => {
      const error = {
        id: 'mockUUID',
        message: 'mockMessage',
      };
      const result = isNotAttachmentError(error);
      expect(result).toEqual(false);
    });
  });

  describe('atleastOneTagExists', () => {
    it('should return true if one or more attachments has a tag', () => {
      const result = atleastOneTagExists(mockAttachments);
      expect(result).toEqual(true);
    });

    it('should return false if none of the attachments has a tag', () => {
      const result = atleastOneTagExists(mockAttachmentsWithoutTag);
      expect(result).toEqual(false);
    });
  });
});

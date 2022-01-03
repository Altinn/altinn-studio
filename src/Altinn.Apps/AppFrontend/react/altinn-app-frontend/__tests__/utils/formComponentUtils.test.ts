import { atleastOneTagExists, getDisplayFormData, getFileUploadWithTagComponentValidations, getFormDataForComponentInRepeatingGroup, isAttachmentError, isNotAttachmentError, isSimpleComponent, parseFileUploadComponentWithTagValidationObject } from '../../src/utils/formComponentUtils';
import { IOptions, ITextResource } from '../../src/types';
import { IFormData } from '../../src/features/form/data/formDataReducer';
import { ILayoutComponent, ISelectionComponentProps } from '../../src/features/form/layout';
import { IAttachment } from '../../src/shared/resources/attachments';

describe('>>> utils/formComponentUtils.ts', () => {
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
  const mockAttachments: IAttachment[] = [
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: ['mockTag'],
      id: '12345'
    },{
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '123456'
    },{
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: null,
      id: '123457'
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
      id: '12345'
    },{
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '123456'
    },{
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: null,
      id: '123457'
    },
  ];

  it('+++ getDisplayFormData should return form data for a component', () => {
    const inputComponent = {
      type: 'Input',
    } as ILayoutComponent;
    const result = getDisplayFormData('mockBindingInput', inputComponent, mockFormData, mockOptions, mockTextResources);
    expect(result).toEqual('test');
  });

  it('+++ getDisplayFormData should return comma separated string of text resources for checkboxes with multiple values', () => {
    const checkboxComponent = {
      type: 'Checkboxes',
      optionsId: 'mockOption',
    } as ISelectionComponentProps;
    const result = getDisplayFormData('mockBindingCheckbox', checkboxComponent, mockFormData, mockOptions, mockTextResources);
    expect(result).toEqual('Value1, Value2');
  });

  it('+++ getDisplayFormData should return object with text resources for checkboxes with multiple values when asObject parameter is true', () => {
    const checkboxComponent = {
      type: 'Checkboxes',
      optionsId: 'mockOption',
    } as ISelectionComponentProps;
    const result = getDisplayFormData('mockBindingCheckbox', checkboxComponent, mockFormData, mockOptions, mockTextResources, true);
    const expected = {
      optionValue1: 'Value1',
      optionValue2: 'Value2',
    };
    expect(result).toEqual(expected);
  });

  it('+++ getFormDataForComponentInRepeatingGroup should return comma separated string of text resources for checkboxes with mulitiple values', () => {
    const checkboxComponent = {
      type: 'Checkboxes',
      optionsId: 'mockRepOption',
      dataModelBindings: {
        simpleBinding: 'group.checkbox',
      },
    } as unknown as ISelectionComponentProps;
    const result = getFormDataForComponentInRepeatingGroup(mockFormData, checkboxComponent, 0, 'group', mockTextResources, mockOptions);
    expect(result).toEqual('RepValue1, RepValue2, RepValue3');
  });

  it('+++ isSimpleComponent should return false when dataModelBinding is undefined', () => {
    const genericComponent = {
      type: 'FileUpload',
    }
    const result = isSimpleComponent(undefined, genericComponent.type);
    expect(result).toEqual(false);
  });

  it('+++ isSimpleComponent should return false when component type is Datepicker', () => {
    const genericComponent = {
      type: 'Datepicker',
      dataModelBindings: {
        simpleBinding: 'group.superdate',
      },
    }
    const result = isSimpleComponent(genericComponent.dataModelBindings, genericComponent.type);
    expect(result).toEqual(false);
  });

  // *********************** BEGIN
  // TODO Move to component tests?
  /* it('+++ getFileUploadComponentWithTagValidations', () => {
    const result = getFileUploadWithTagComponentValidations(props.validationMessages, validationState);
    expect(result).toEqual(true);
  });

  it('+++ parseFileUploadComponentWithTagValidationObject ', () => {
    const result = parseFileUploadComponentWithTagValidationObject(validationArray);
    expect(result).toEqual(true);
  }); */
  // *********************** END

  it('+++ isAttachmentError should return true when error has attachmentId', () => {
    const error = {
      id: 'mockUUID',
      message: 'mockMessage'
    }
    const result = isAttachmentError(error);
    expect(result).toEqual(true);
  });

  it('+++ isAttachmentError should return false when error does not have attachmentId', () => {
    const error = {
      id: null,
      message: 'mockMessage'
    }
    const result = isAttachmentError(error);
    expect(result).toEqual(false);
  });

  it('+++ isNotAttachmentError should return true when error does not have attachmentId', () => {
    const error = {
      id: null,
      message: 'mockMessage'
    }
    const result = isNotAttachmentError(error);
    expect(result).toEqual(true);
  });

  it('+++ isNotAttachmentError should return false when error has attachmentId', () => {
    const error = {
      id: 'mockUUID',
      message: 'mockMessage'
    }
    const result = isNotAttachmentError(error);
    expect(result).toEqual(false);
  });

  it('+++ atleastOneTagExists should return true if one or more attachments has a tag', () => {
    const result = atleastOneTagExists(mockAttachments);
    expect(result).toEqual(true);
  });

  it('+++ atleastOneTagExists should return false if none of the attachments has a tag', () => {
    const result = atleastOneTagExists(mockAttachmentsWithoutTag);
    expect(result).toEqual(false);
  });
});

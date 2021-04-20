import { getDisplayFormData, getFormDataForComponentInRepeatingGroup } from '../../src/utils/formComponentUtils';
import { IOptions, ITextResource } from '../../src/types';
import { IFormData } from '../../src/features/form/data/formDataReducer';
import { ILayoutComponent, ISelectionComponentProps } from '../../src/features/form/layout';

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

  it('+++ getDisplayFormData should return form data for a component', () => {
    const inputComponent = {
      type: 'Input',
    } as ILayoutComponent;
    const result = getDisplayFormData('mockBindingInput', inputComponent, mockFormData, mockOptions, mockTextResources);
    expect(result).toEqual('test');
  });

  it('+++ getDisplayFormData should return comma separated string of text resources for checkboxes with mulitiple values', () => {
    const checkboxComponent = {
      type: 'Checkboxes',
      optionsId: 'mockOption',
    } as ISelectionComponentProps;
    const result = getDisplayFormData('mockBindingCheckbox', checkboxComponent, mockFormData, mockOptions, mockTextResources);
    expect(result).toEqual('Value1, Value2');
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
});

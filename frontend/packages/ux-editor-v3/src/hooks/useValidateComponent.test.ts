import { ComponentType } from 'app-shared/types/ComponentType';
import { ErrorCode, useValidateComponent } from './useValidateComponent';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';
import { optionListIdsMock, renderHookWithMockStore } from '../testing/mocks';

describe('useValidateComponent', () => {
  describe('Checkboxes', () => {
    it('Returns ErrorCode.NoOptions if there are no options', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({
        isValid: false,
        error: ErrorCode.NoOptions,
      });
    });

    it('Returns ErrorCode.DuplicateValues if there are duplicate values', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [
          { label: 'test1', value: 'test' },
          { label: 'test2', value: 'test' },
        ],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({
        isValid: false,
        error: ErrorCode.DuplicateValues,
      });
    });

    it('Returns { isValid: true } if optionsId is filled in', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: optionListIdsMock[0],
        options: [],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({ isValid: true });
    });

    it('Returns { isValid: true } if there are no errors', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [
          { label: 'test1', value: 'test1' },
          { label: 'test2', value: 'test2' },
        ],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({ isValid: true });
    });
  });

  describe('RadioButtons', () => {
    it('Returns ErrorCode.NoOptions if there are no options', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({
        isValid: false,
        error: ErrorCode.NoOptions,
      });
    });

    it('Returns ErrorCode.DuplicateValues if there are duplicate values', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [
          { label: 'test1', value: 'test' },
          { label: 'test2', value: 'test' },
        ],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({
        isValid: false,
        error: ErrorCode.DuplicateValues,
      });
    });

    it('Returns { isValid: true } if optionsId is filled in', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: optionListIdsMock[1],
        options: [],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({ isValid: true });
    });

    it('Returns { isValid: true } if there are no errors', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: '',
        options: [
          { label: 'test1', value: 'test1' },
          { label: 'test2', value: 'test2' },
        ],
        dataModelBindings: {},
      };
      expect(render(component)).toEqual({ isValid: true });
    });
  });

  it('Returns { isValid: true } by default', () => {
    const component: FormComponent = {
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      id: 'test',
      dataModelBindings: {},
    };
    expect(render(component)).toEqual({ isValid: true });
  });
});

const render = (component: FormComponent) => {
  const queries = {
    getOptionListIds: jest
      .fn()
      .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock)),
  };
  return renderHookWithMockStore({}, queries)(() => useValidateComponent(component))
    .renderHookResult.result.current;
};

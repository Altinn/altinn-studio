import { ComponentType } from 'app-shared/types/ComponentType';
import { ErrorCode, validateComponent } from './validateComponent';
import { FormCheckboxesComponent, FormComponent, FormRadioButtonsComponent } from '../../types/FormComponent';

describe('validateComponent', () => {
  describe('validateCheckboxGroup', () => {
    it('Returns ErrorCode.NoOptions if there are no options', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({
        isValid: false,
        error: ErrorCode.NoOptions,
      });
    });

    it('Returns ErrorCode.DuplicateValues if there are duplicate values', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [
          { label: 'test1', value: 'test' },
          { label: 'test2', value: 'test' },
        ],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({
        isValid: false,
        error: ErrorCode.DuplicateValues,
      });
    });

    it('Returns { isValid: true } if there are no errors', () => {
      const component: FormCheckboxesComponent = {
        type: ComponentType.Checkboxes,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [
          { label: 'test1', value: 'test1' },
          { label: 'test2', value: 'test2' },
        ],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({ isValid: true });
    });
  });

  describe('validateRadioGroup', () => {
    it('Returns ErrorCode.NoOptions if there are no options', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({
        isValid: false,
        error: ErrorCode.NoOptions,
      });
    });

    it('Returns ErrorCode.DuplicateValues if there are duplicate values', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [
          { label: 'test1', value: 'test' },
          { label: 'test2', value: 'test' },
        ],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({
        isValid: false,
        error: ErrorCode.DuplicateValues,
      });
    });

    it('Returns { isValid: true } if there are no errors', () => {
      const component: FormRadioButtonsComponent = {
        type: ComponentType.RadioButtons,
        itemType: 'COMPONENT',
        id: 'test',
        optionsId: 'test',
        options: [
          { label: 'test1', value: 'test1' },
          { label: 'test2', value: 'test2' },
        ],
        dataModelBindings: {},
      };
      expect(validateComponent(component)).toEqual({ isValid: true });
    });
  });

  it('Returns { isValid: true } by default', () => {
    const component: FormComponent = {
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      id: 'test',
      dataModelBindings: {},
    };
    expect(validateComponent(component)).toEqual({ isValid: true });
  });
});

import { IOption } from '../types/global';
import {
  addOptionToComponent,
  changeComponentOptionLabel,
  changeTextResourceBinding,
  generateFormItem,
} from './component';
import { ComponentType } from '../components';
import { FormCheckboxesComponent, FormComponent, FormRadioButtonsComponent } from '../types/FormComponent';

describe('Component utils', () => {
  describe('changeTextResourceBinding', () => {
    it('Changes given text resource binding and nothing else', () => {
      const bindingKeyToKeep = 'testKey';
      const resourceKeyToKeep = 'testResourceKey';
      const bindingKeyToChange = 'testKeyToChange';
      const resourceKeyToChange = 'testResourceKeyToChange';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          [bindingKeyToKeep]: resourceKeyToKeep,
          [bindingKeyToChange]: resourceKeyToChange,
        },
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      };
      expect(changeTextResourceBinding(component, bindingKeyToChange, newResourceKey)).toEqual({
        ...component,
        textResourceBindings: {
          [bindingKeyToKeep]: resourceKeyToKeep,
          [bindingKeyToChange]: newResourceKey,
        }
      });
    });
  });

  describe('changeTitleBinding', () => {
    it('Changes title binding', () => {
      const titleResourceKey = 'testResourceKey';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          title: titleResourceKey,
        },
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      };
      expect(
        changeTextResourceBinding(component, 'title', newResourceKey)
          .textResourceBindings
          .title
      ).toEqual(newResourceKey);
    });
  });

  describe('changeDescriptionBinding', () => {
    it('Changes description binding', () => {
      const descriptionResourceKey = 'testResourceKey';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          description: descriptionResourceKey,
        },
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      };
      expect(
        changeTextResourceBinding(component, 'description', newResourceKey)
          .textResourceBindings
          .description
      ).toEqual(newResourceKey);
    });
  });

  describe('addOptionToComponent', () => {
    it.each([
      ComponentType.Checkboxes,
      ComponentType.RadioButtons
    ] as (ComponentType.Checkboxes | ComponentType.RadioButtons)[])(
      'Adds option to %s component',
      (componentType) => {
        const component: FormCheckboxesComponent | FormRadioButtonsComponent = {
          id: 'test',
          type: componentType,
          options: [
            {
              label: 'testLabel',
              value: 'testValue',
            }
          ],
          optionsId: null,
          itemType: 'COMPONENT',
          dataModelBindings: {},
        };
        const newOption: IOption = {
          label: 'newTestLabel',
          value: 'newTestValue',
        };
        expect(addOptionToComponent(component, newOption)).toEqual({
          ...component,
          options: [...component.options, newOption],
        });
      }
    );
  });

  describe('changeComponentOptionLabel', () => {
    it.each([
      ComponentType.Checkboxes,
      ComponentType.RadioButtons
    ] as (ComponentType.Checkboxes | ComponentType.RadioButtons)[])(
      'Changes label of option with given value on %s component',
      (componentType) => {
        const valueOfWhichLabelShouldChange = 'testValue2';
        const component: FormCheckboxesComponent | FormRadioButtonsComponent = {
          id: 'test',
          type: componentType,
          options: [
            {
              label: 'testLabel',
              value: 'testValue',
            },
            {
              label: 'testLabel2',
              value: valueOfWhichLabelShouldChange,
            },
          ],
          optionsId: null,
          itemType: 'COMPONENT',
          dataModelBindings: {},
        };
        const newLabel = 'newTestLabel';
        expect(changeComponentOptionLabel(
          component,
          valueOfWhichLabelShouldChange,
          newLabel
        ).options).toEqual(expect.arrayContaining([{
          label: newLabel,
          value: valueOfWhichLabelShouldChange,
        }]));
      }
    );
  });

  describe('generateFormItem', () => {
    it.each(Object.values(ComponentType).filter((v) => v !== ComponentType.Group))(
      'Generates component of type %s with given ID',
      (componentType) => {
        const id = 'testId';
        const component = generateFormItem(componentType, id);
        expect(component).toEqual(expect.objectContaining({
          id,
          type: componentType,
          itemType: 'COMPONENT',
        }));
      }
    );

    it('Generates container when type is Group', () => {
      const component = generateFormItem(ComponentType.Group, 'testId');
      expect(component).toEqual(expect.objectContaining({
        itemType: 'CONTAINER',
      }));
    });
  });
});

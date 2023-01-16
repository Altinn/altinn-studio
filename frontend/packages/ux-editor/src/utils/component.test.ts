import { IFormCheckboxComponent, IFormComponent, IFormRadioButtonComponent, IOption } from '../types/global';
import {
  addOptionToComponent, changeComponentOptionLabel,
  changeTextResourceBinding,
} from './component';
import { ComponentTypes } from '../components';

describe('Component utils', () => {
  describe('changeTextResourceBinding', () => {
    it('Changes given text resource binding and nothing else', () => {
      const bindingKeyToKeep = 'testKey';
      const resourceKeyToKeep = 'testResourceKey';
      const bindingKeyToChange = 'testKeyToChange';
      const resourceKeyToChange = 'testResourceKeyToChange';
      const newResourceKey = 'newResourceKey';
      const component: IFormComponent = {
        id: 'test',
        textResourceBindings: {
          [bindingKeyToKeep]: resourceKeyToKeep,
          [bindingKeyToChange]: resourceKeyToChange,
        },
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
      const component: IFormComponent = {
        id: 'test',
        textResourceBindings: {
          title: titleResourceKey,
        },
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
      const component: IFormComponent = {
        id: 'test',
        textResourceBindings: {
          description: descriptionResourceKey,
        },
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
      ComponentTypes.Checkboxes,
      ComponentTypes.RadioButtons
    ] as (ComponentTypes.Checkboxes | ComponentTypes.RadioButtons)[])(
      'Adds option to %s component',
      (componentType) => {
        const component: IFormCheckboxComponent | IFormRadioButtonComponent = {
          id: 'test',
          type: componentType,
          options: [
            {
              label: 'testLabel',
              value: 'testValue',
            }
          ],
          optionsId: null
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
      ComponentTypes.Checkboxes,
      ComponentTypes.RadioButtons
    ] as (ComponentTypes.Checkboxes | ComponentTypes.RadioButtons)[])(
      'Changes label of option with given value on %s component',
      (componentType) => {
        const valueOfWhichLabelShouldChange = 'testValue2';
        const component: IFormCheckboxComponent | IFormRadioButtonComponent = {
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
          optionsId: null
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
});

import { getComponentHelperTextByComponentType, getComponentTitleByComponentType, getTextResource } from './language';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '../../../../testing/mocks/i18nMock';

describe('Designer > utils/language', () => {
  describe('getComponentHelperTextByComponentType', () => {
    it('should return specific help text when component type is known', () => {
      Object.values(ComponentType).forEach((componentType) => {
        expect(getComponentHelperTextByComponentType(componentType, textMock)).toBe(
          textMock(`ux_editor.component_helpText.${componentType}`)
        );
      });
    });
  });

  describe('getComponentTitleByComponentType', () => {
    it('should return specific help text when component type is known', () => {
      Object.values(ComponentType).forEach((componentType) => {
        expect(getComponentTitleByComponentType(componentType, textMock)).toBe(
          textMock(`ux_editor.component_title.${componentType}`)
        );
      });
    });
  });

  describe('getTextResource', () => {
    const textResources = [{ id: 'test', value: 'test' }];
    const textResource = textResources[0];

    it('should return the text resource', () => {
      expect(getTextResource(textResource.id, textResources)).toBe(textResource.value);
    });
    it('should return undefined when resourceKey is empty', () => {
      expect(getTextResource('', textResources)).toBeUndefined();
    });
    it('should return undefined when resources are empty', () => {
      expect(getTextResource(textResource.id, [])).toBeUndefined();
    });
    it('should return undefined when the text resource doesn\'t exist', () => {
      expect(getTextResource('wrong-id', textResources)).toBeUndefined();
    });
  });
});

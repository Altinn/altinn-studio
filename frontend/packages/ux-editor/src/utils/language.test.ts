import {
  getComponentHelperTextByComponentType,
  getTextResource,
  getTitleByComponentType,
} from './language';
import { ComponentType } from 'app-shared/types/ComponentType';
import { mockUseTranslation } from '@studio/testing/mocks/i18nMock';

describe('Designer > utils/language', () => {
  describe('getComponentHelperTextByComponentType', () => {
    const componentHelpTexts = {
      'ux_editor.component_help_text.default': 'Default help text',
    };
    Object.values(ComponentType).forEach((componentType) => {
      componentHelpTexts[`ux_editor.component_help_text.${componentType}`] =
        `Help text for ${componentType}`;
    });

    const { t } = mockUseTranslation(componentHelpTexts);
    it('should return specific help text when component type is known', () => {
      Object.values(ComponentType).forEach((componentType) => {
        expect(getComponentHelperTextByComponentType(componentType, t)).toBe(
          `Help text for ${componentType}`,
        );
      });
    });

    it('should return default help text when component type is unknown', () => {
      expect(getComponentHelperTextByComponentType(undefined, t)).toBe('Default help text');
    });
  });

  describe('getTitleByComponentType', () => {
    const componentTitleTexts = {};
    Object.values(ComponentType).forEach((componentType) => {
      componentTitleTexts[`ux_editor.component_title.${componentType}`] =
        `Title text for ${componentType}`;
    });

    it('should return specific title text it exists', () => {
      const { t } = mockUseTranslation(componentTitleTexts);
      Object.values(ComponentType).forEach((componentType) => {
        expect(getTitleByComponentType(componentType, t)).toBe(`Title text for ${componentType}`);
      });
    });

    it('should return component type when title text does not exist', () => {
      const { t } = mockUseTranslation({
        [`ux_editor.component_title.${ComponentType.Accordion}`]: `Title text for ${ComponentType.Accordion}`,
      });
      expect(getTitleByComponentType(ComponentType.Input, t)).toBe(ComponentType.Input);
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
    it("should return undefined when the text resource doesn't exist", () => {
      expect(getTextResource('wrong-id', textResources)).toBeUndefined();
    });
  });
});

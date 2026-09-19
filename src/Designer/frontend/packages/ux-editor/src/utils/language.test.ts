import {
  getComponentHelperTextByComponentType,
  getTextResource,
  getTitleByComponentType,
} from './language';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { mockUseTranslation } from '@studio/testing/mocks/i18nMock';
import { componentCatalog } from '@app/layout-contract';
import type { PropertyDefinition } from '@app/layout-contract';
import nbTranslations from '../../../../language/src/nb.json';
import enTranslations from '../../../../language/src/en.json';
import i18next from 'i18next';

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

    it('uses the generated component name when a Designer translation does not exist', () => {
      const { t } = mockUseTranslation({
        [`ux_editor.component_title.${ComponentType.Accordion}`]: `Title text for ${ComponentType.Accordion}`,
      });
      const language = i18next.language?.split('-')[0] === 'nb' ? 'nb' : 'en';
      expect(getTitleByComponentType(ComponentType.Input, t)).toBe(
        componentCatalog.Input.metadata.name[language],
      );
    });

    it('defines component titles in every supported language', () => {
      const translations = [nbTranslations, enTranslations] as Record<string, string>[];
      const componentNames = [...Object.values(ComponentType), ...Object.values(ComponentPreset)];

      componentNames.forEach((componentName) => {
        translations.forEach((language) => {
          expect(Object.hasOwn(language, `ux_editor.component_title.${componentName}`)).toBe(true);
        });
      });
    });

    it('keeps Designer component-name translations aligned with the generated catalogue', () => {
      Object.entries(componentCatalog).forEach(([componentType, definition]) => {
        const key = `ux_editor.component_title.${componentType}`;
        expect((nbTranslations as Record<string, string>)[key]).toBe(definition.metadata.name.nb);
        expect((enTranslations as Record<string, string>)[key]).toBe(definition.metadata.name.en);
      });
    });

    it('defines labels and placeholders for every generated binding', () => {
      const translations = [nbTranslations, enTranslations] as Record<string, string>[];
      const textResourceBindings = collectBindingKeys('textResourceBindings');
      const dataModelBindings = collectBindingKeys('dataModelBindings').filter(
        (binding) => binding !== 'simpleBinding',
      );

      translations.forEach((language) => {
        textResourceBindings.forEach((binding) => {
          const key = `ux_editor.modal_properties_textResourceBindings_${binding}`;
          expect(Object.hasOwn(language, key)).toBe(true);
          expect(Object.hasOwn(language, `${key}_add`)).toBe(true);
        });
        dataModelBindings.forEach((binding) => {
          expect(
            Object.hasOwn(language, `ux_editor.modal_properties_data_model_label.${binding}`),
          ).toBe(true);
        });
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
    it("should return undefined when the text resource doesn't exist", () => {
      expect(getTextResource('wrong-id', textResources)).toBeUndefined();
    });
  });
});

function collectBindingKeys(bindingType: 'textResourceBindings' | 'dataModelBindings'): string[] {
  const collectObjectKeys = (definition?: PropertyDefinition): string[] => {
    if (!definition) return [];
    if (definition.type === 'object') return Object.keys(definition.properties);
    if (definition.type === 'union') return definition.variants.flatMap(collectObjectKeys);
    return [];
  };

  return [
    ...new Set(
      Object.values(componentCatalog).flatMap((component) =>
        collectObjectKeys(component.properties[bindingType]),
      ),
    ),
  ];
}

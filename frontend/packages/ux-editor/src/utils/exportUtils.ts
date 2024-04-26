import type { ITextResource, ITextResources } from 'app-shared/types/global';
import type {
  ExportForm,
  ExportFormComponent,
  ExportOption,
  ExportTextResource,
  ExportTextResourceValue,
} from '../types/ExportForm';
import type { IFormLayouts, IOption, ITextResourceBindings } from '../types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { internalLayoutToExternal } from '../converters/formLayoutConverters';
import type { ExternalFormLayout } from 'app-shared/types/api';

export const generateExportFormFormat = (
  pageOrder: string[],
  formLayouts: IFormLayouts,
  textResources: ITextResources,
  optionLists: KeyValuePairs<any>,
  defaultLanguage,
  includeRestProperties = false,
): ExportForm => {
  const exportForm: ExportForm = {};
  pageOrder.forEach((layoutName) => {
    const layout = formLayouts[layoutName];
    const exportFormPage: ExportFormComponent[] = [];
    const externalLayout: ExternalFormLayout = internalLayoutToExternal(layout);
    externalLayout.data.layout.forEach((component) => {
      const { id, type, dataModelBindings, textResourceBindings, optionsId, ...rest } = component;
      let exportComponent = {
        id,
        type,
        dataModelBindings,
      } as ExportFormComponent;
      exportComponent.texts = mapTextResourceBindingsToExportFormat(
        textResourceBindings,
        textResources,
        defaultLanguage,
      );
      exportComponent.options = component.options
        ? mapOptionsToExportFormat(component.options, textResources, defaultLanguage)
        : optionsId
          ? mapOptionsToExportFormat(optionLists[optionsId], textResources, defaultLanguage)
          : undefined;

      if (includeRestProperties) {
        exportComponent = { ...exportComponent, ...rest } as ExportFormComponent;
      }

      exportFormPage.push(exportComponent);
    });

    exportForm[layoutName] = exportFormPage;
  });
  return exportForm;
};

const mapTextResourceBindingsToExportFormat = (
  textResourceBindings: ITextResourceBindings,
  textResources: ITextResources,
  defaultLanguage: string,
): ExportTextResource[] => {
  const result = [];
  if (!textResourceBindings) return result;
  Object.keys(textResourceBindings).map((textResourceBindingKey) => {
    const textValues = getTextValues(
      textResources,
      textResourceBindings[textResourceBindingKey],
      defaultLanguage,
      (textResource) => textResource.id === textResourceBindings[textResourceBindingKey],
    );
    const textObject: ExportTextResource = {
      id: textResourceBindings[textResourceBindingKey],
      type: textResourceBindingKey,
      text: textValues,
    };
    result.push(textObject);
  });
  return result;
};

const getTextValues = (
  textResources: ITextResources,
  textResourceKey: string,
  defaultLanguage: string,
  findFunction?: (textResource: ITextResource) => boolean,
): ExportTextResourceValue[] => {
  if (defaultLanguage) {
    return [
      {
        language: defaultLanguage,
        value: textResources[defaultLanguage].find(findFunction)?.value ?? textResourceKey,
      },
    ];
  }

  return Object.keys(textResources).map((language) => ({
    language: language,
    value: textResources[language].find(findFunction)?.value ?? textResourceKey,
  }));
};

const mapOptionsToExportFormat = (
  options: IOption[],
  textResources: ITextResources,
  defaultLanguage: string,
): ExportOption[] => {
  if (!options) return undefined;
  const result: ExportOption[] = options.map((option) => {
    const textValues = getTextValues(
      textResources,
      option.label,
      defaultLanguage,
      (textResource) => textResource.id === option.label,
    );
    return {
      value: option.value,
      label: textValues,
    };
  });
  return result;
};

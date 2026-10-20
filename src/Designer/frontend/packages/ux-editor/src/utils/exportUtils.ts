import type { ITextResource, ITextResources } from 'app-shared/types/global';
import type {
  ExportForm,
  ExportFormComponent,
  ExportFormPage,
  ExportOption,
  ExportTextResource,
  ExportTextResourceValue,
} from '../types/ExportForm';
import type { IFormLayouts, IOption } from '../types/global';
import { internalLayoutToExternal } from '../converters/formLayoutConverters';
import type { SerializedComponent, SerializedFormLayout } from '../types/SerializedComponent';
import type { OptionListData } from 'app-shared/types/OptionList';

export class ExportUtils {
  private readonly pageOrder: string[];
  private readonly formLayouts: IFormLayouts;
  private readonly layoutSetName: string;
  private readonly appId: string;
  private readonly textResources: ITextResources;
  private readonly optionListDataList: OptionListData[];
  private readonly defaultLanguage: string;
  private readonly includeRestProperties: boolean;

  constructor(
    pageOrder: string[],
    formLayouts: IFormLayouts,
    layoutSetName: string,
    appId: string,
    textResources: ITextResources,
    optionListsData: OptionListData[],
    defaultLanguage: string,
    includeRestProperties: boolean = false,
  ) {
    this.pageOrder = pageOrder;
    this.formLayouts = formLayouts;
    this.layoutSetName = layoutSetName;
    this.appId = appId;
    this.textResources = textResources;
    this.optionListDataList = optionListsData;
    this.defaultLanguage = defaultLanguage;
    this.includeRestProperties = includeRestProperties;
  }

  public generateExportFormFormat = (): ExportForm => {
    const exportForm: ExportForm = {
      appId: this.appId,
      formId: this.layoutSetName,
      pages: [],
    };
    this.pageOrder?.forEach((layoutName: string, index: number) => {
      exportForm.pages.push(this.generateLayoutExportFormat(layoutName, index));
    });
    return exportForm;
  };

  private generateLayoutExportFormat = (layoutName: string, index: number): ExportFormPage => {
    const layout = this.formLayouts[layoutName];
    const exportFormPage: ExportFormPage = {
      pageId: layoutName,
      sortOrder: index,
      components: [],
    };
    const externalLayout: SerializedFormLayout = internalLayoutToExternal(layout);
    externalLayout.data.layout.forEach((component, i) => {
      exportFormPage.components.push(this.generateComponentExportFormat(component, i));
    });

    return exportFormPage;
  };

  private generateComponentExportFormat = (
    component: SerializedComponent,
    index: number,
  ): ExportFormComponent => {
    const { id, type, dataModelBindings, textResourceBindings, optionsId, ...rest } = component;
    let exportComponent = {
      id,
      type,
      dataModelBindings,
    } as ExportFormComponent;
    exportComponent.texts = this.mapTextResourceBindingsToExportFormat(textResourceBindings);
    const options = this.getComponentOptionsOrUndefined(component);
    if (options) {
      exportComponent.options = this.mapOptionsToExportFormat(options);
    }

    exportComponent.sortOrder = index;

    if (this.includeRestProperties) {
      exportComponent = { ...exportComponent, ...rest } as ExportFormComponent;
    }

    return exportComponent;
  };

  private mapTextResourceBindingsToExportFormat = (
    textResourceBindings: object | undefined,
  ): ExportTextResource[] => {
    const result = [];
    if (!textResourceBindings) return result;
    Object.entries(textResourceBindings).map(([textResourceBindingKey, binding]) => {
      if (typeof binding !== 'string') return;
      const textValues = this.getTextValues(binding, (textResource) => textResource.id === binding);
      const textObject: ExportTextResource = {
        id: binding,
        type: textResourceBindingKey,
        text: textValues,
      };
      result.push(textObject);
    });
    return result;
  };

  private getTextValues = (
    textResourceKey: string,
    findFunction?: (textResource: ITextResource) => boolean,
  ): ExportTextResourceValue[] => {
    if (this.defaultLanguage) {
      return [
        {
          language: this.defaultLanguage,
          value:
            this.textResources[this.defaultLanguage].find(findFunction)?.value ?? textResourceKey,
        },
      ];
    }

    return Object.keys(this.textResources).map((language) => ({
      language: language,
      value: this.textResources[language].find(findFunction)?.value ?? textResourceKey,
    }));
  };

  private getComponentOptionsOrUndefined = (
    component: SerializedComponent,
  ): IOption[] | undefined => {
    if (Array.isArray(component.options)) {
      return component.options;
    }
    if (typeof component.optionsId === 'string') {
      const optionListData = this.optionListDataList.find(
        (optionListData) => optionListData.title === component.optionsId,
      );
      return optionListData?.data;
    }
    return undefined;
  };

  private mapOptionsToExportFormat = (options: IOption[]): ExportOption[] => {
    const result: ExportOption[] = options.map((option) => {
      const textValues = this.getTextValues(
        option.label,
        (textResource) => textResource.id === option.label,
      );
      return {
        value: option.value,
        label: textValues,
      };
    });
    return result;
  };
}

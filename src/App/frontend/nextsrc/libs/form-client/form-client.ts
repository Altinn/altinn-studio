import { convertData } from 'nextsrc/libs/form-client/convertData';
import { resolveExpressionValidationConfig } from 'nextsrc/libs/form-client/expressionValidation';
import { moveChildren } from 'nextsrc/libs/form-client/moveChildren';
import { lookupSchemaForPath } from 'nextsrc/libs/form-client/schemaLookup';
import { createSchemaValidator } from 'nextsrc/libs/form-client/schemaValidation';
import { createFormDataStore } from 'nextsrc/libs/form-client/stores/formDataStore';
import { createTextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import { createValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';
import type Ajv from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/api-client/data.api';
import type {
  ExpressionValidationConfig,
  ResolvedExpressionValidations,
} from 'nextsrc/libs/form-client/expressionValidation';
import type { ResolvedLayoutCollection, ResolvedLayoutFile } from 'nextsrc/libs/form-client/moveChildren';
import type { FormDataStore } from 'nextsrc/libs/form-client/stores/formDataStore';
import type { TextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import type { ValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';
import type { StoreApi } from 'zustand';

import type { IRawTextResource } from 'src/features/language/textResources';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IApplicationSettings } from 'src/types/shared';

export interface FormDataChangeEvent {
  path: string;
  value: FormDataNode;
  previousValue: FormDataNode;
  dataType: string;
}

export type FormDataChangeCallback = (event: FormDataChangeEvent) => void;
export type Unsubscribe = () => void;

export interface FormClientConfig {
  defaultDataType?: string;
  textResources?: IRawTextResource[];
  language?: string;
  applicationSettings?: IApplicationSettings | null;
  instanceDataSources?: Record<string, string> | null;
}

export class FormClient {
  public readonly formDataStore: StoreApi<FormDataStore>;
  public readonly textResourceStore: StoreApi<TextResourceStore>;
  public readonly validationStore: StoreApi<ValidationStore>;
  public defaultDataType: string;

  private layoutCollection: ResolvedLayoutCollection = {};
  private cachedLayoutNames: string[] = [];
  private pageOrder: string[] = [];
  private applicationSettings: IApplicationSettings | null;
  private instanceDataSources: Record<string, string> | null;
  private formDataChangeCallbacks = new Set<FormDataChangeCallback>();
  private dataModelSchemas: Record<string, JSONSchema7> = {};
  private schemaValidators: Record<string, Ajv> = {};
  private expressionValidationsByDataType: Record<string, ResolvedExpressionValidations> = {};

  constructor(config: FormClientConfig = {}) {
    this.defaultDataType = config.defaultDataType ?? 'default';
    this.applicationSettings = config.applicationSettings ?? null;
    this.instanceDataSources = config.instanceDataSources ?? null;

    this.formDataStore = createFormDataStore(this.defaultDataType, null, {
      onChange: (path, value, previousValue, dataType) => {
        for (const cb of this.formDataChangeCallbacks) {
          cb({ path, value, previousValue, dataType });
        }
      },
      coerceValue: (path, value, dataType) => this.coerceValue(path, value, dataType),
    });
    this.textResourceStore = createTextResourceStore({
      resources: config.textResources,
      language: config.language,
    });
    this.validationStore = createValidationStore();
  }

  onFormDataChange(callback: FormDataChangeCallback): Unsubscribe {
    this.formDataChangeCallbacks.add(callback);
    return () => {
      this.formDataChangeCallbacks.delete(callback);
    };
  }

  get textResourceDataSources() {
    return {
      formDataGetter: (path: string) => this.formDataStore.getState().getValue(path, this.defaultDataType),
      applicationSettings: this.applicationSettings,
      instanceDataSources: this.instanceDataSources,
      customTextParameters: null,
    };
  }

  public setDefaultDataType(dataType: string) {
    this.defaultDataType = dataType;
    this.formDataStore.setState({ defaultDataType: dataType });
  }

  public setFormData(data: FormDataNode, dataType?: string) {
    this.formDataStore.getState().setData(data, this.resolveDataType(dataType));
  }

  public setDataModelSchema(schema: JSONSchema7, dataType?: string) {
    const resolvedDataType = this.resolveDataType(dataType);
    this.dataModelSchemas[resolvedDataType] = schema;
    this.schemaValidators[resolvedDataType] = createSchemaValidator(schema);
  }

  public getSchemaValidator(dataType?: string): Ajv | null {
    return this.schemaValidators[this.resolveDataType(dataType)] ?? null;
  }

  setLayoutCollection(layoutCollection: ILayoutCollection) {
    this.layoutCollection = Object.fromEntries(
      Object.entries(layoutCollection).map(([key, layout]) => [key, moveChildren(layout)]),
    );
    this.cachedLayoutNames = Object.keys(this.layoutCollection);
  }

  getFormLayout(layoutName: string): ResolvedLayoutFile {
    return this.layoutCollection[layoutName];
  }

  getLayoutNames(): string[] {
    return this.cachedLayoutNames;
  }

  setPageOrder(order: string[]) {
    this.pageOrder = order;
  }

  getPageOrder(): string[] {
    return this.pageOrder;
  }

  setApplicationSettings(settings: IApplicationSettings | null) {
    this.applicationSettings = settings;
  }

  setInstanceDataSources(sources: Record<string, string> | null) {
    this.instanceDataSources = sources;
  }

  public setExpressionValidationConfig(config: ExpressionValidationConfig | null, dataType?: string) {
    const dt = this.resolveDataType(dataType);
    this.expressionValidationsByDataType[dt] = config ? resolveExpressionValidationConfig(config) : {};
  }

  public getExpressionValidations(dataType?: string): ResolvedExpressionValidations {
    return this.expressionValidationsByDataType[this.resolveDataType(dataType)] ?? {};
  }

  private resolveDataType(dataType?: string): string {
    return dataType ?? this.defaultDataType;
  }

  private coerceValue(
    path: string,
    value: FormDataPrimitive,
    dataType: string,
  ): { value: FormDataPrimitive; error: boolean } {
    const schema = this.dataModelSchemas[dataType];
    if (!schema) {
      return { value, error: false };
    }

    const fieldSchema = lookupSchemaForPath(schema, path);
    if (!fieldSchema) {
      return { value, error: false };
    }

    const result = convertData(value, fieldSchema);
    return { value: result.value as FormDataPrimitive, error: result.error };
  }
}

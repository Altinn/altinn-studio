import { convertData } from 'nextsrc/libs/form-client/convertData';
import { resolveExpressionValidationConfig } from 'nextsrc/libs/form-client/expressionValidation';
import { moveChildren } from 'nextsrc/libs/form-client/moveChildren';
import { lookupSchemaForPath } from 'nextsrc/libs/form-client/schemaLookup';
import { createSchemaValidator } from 'nextsrc/libs/form-client/schemaValidation';
import { createFormDataStore } from 'nextsrc/libs/form-client/stores/formDataStore';
import { createTextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import { createValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';

import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';
import type {
  ExpressionValidationConfig,
  ResolvedExpressionValidations,
} from 'nextsrc/libs/form-client/expressionValidation';
import type { ResolvedLayoutCollection, ResolvedLayoutFile } from 'nextsrc/libs/form-client/moveChildren';
import type { FormDataStore } from 'nextsrc/libs/form-client/stores/formDataStore';
import type { TextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import type { ValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';
import type Ajv from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { StoreApi } from 'zustand';

import type { IRawTextResource } from 'src/features/language/textResources';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IApplicationSettings } from 'src/types/shared';

export interface FormDataChangeEvent {
  path: string;
  value: FormDataNode;
  previousValue: FormDataNode;
}

export type FormDataChangeCallback = (event: FormDataChangeEvent) => void;
export type Unsubscribe = () => void;

export interface FormClientConfig {
  textResources?: IRawTextResource[];
  language?: string;
  applicationSettings?: IApplicationSettings | null;
  instanceDataSources?: Record<string, string> | null;
}

export class FormClient {
  public readonly formDataStore: StoreApi<FormDataStore>;
  public readonly textResourceStore: StoreApi<TextResourceStore>;
  public readonly validationStore: StoreApi<ValidationStore>;

  private layoutCollection: ResolvedLayoutCollection = {};
  private cachedLayoutNames: string[] = [];
  private pageOrder: string[] = [];
  private applicationSettings: IApplicationSettings | null;
  private instanceDataSources: Record<string, string> | null;
  private formDataChangeCallbacks = new Set<FormDataChangeCallback>();
  private dataModelSchema: JSONSchema7 | null = null;
  private schemaValidator: Ajv | null = null;
  private expressionValidations: ResolvedExpressionValidations = {};

  constructor(config: FormClientConfig = {}) {
    this.applicationSettings = config.applicationSettings ?? null;
    this.instanceDataSources = config.instanceDataSources ?? null;

    this.formDataStore = createFormDataStore(null, {
      onChange: (path, value, previousValue) => {
        for (const cb of this.formDataChangeCallbacks) {
          cb({ path, value, previousValue });
        }
      },
      coerceValue: (path, value) => this.coerceValue(path, value),
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
      formDataGetter: (path: string) => this.formDataStore.getState().getValue(path),
      applicationSettings: this.applicationSettings,
      instanceDataSources: this.instanceDataSources,
      customTextParameters: null,
    };
  }

  setFormData(data: FormDataNode) {
    this.formDataStore.getState().setData(data);
  }

  setDataModelSchema(schema: JSONSchema7) {
    this.dataModelSchema = schema;
    this.schemaValidator = createSchemaValidator(schema);
  }

  getSchemaValidator(): Ajv | null {
    return this.schemaValidator;
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

  setExpressionValidationConfig(config: ExpressionValidationConfig | null) {
    this.expressionValidations = config ? resolveExpressionValidationConfig(config) : {};
  }

  getExpressionValidations(): ResolvedExpressionValidations {
    return this.expressionValidations;
  }

  private coerceValue(path: string, value: FormDataPrimitive): { value: FormDataPrimitive; error: boolean } {
    if (!this.dataModelSchema) {
      // No schema loaded yet — pass through without coercion
      return { value, error: false };
    }

    const fieldSchema = lookupSchemaForPath(this.dataModelSchema, path);
    if (!fieldSchema) {
      // Path not found in schema — pass through
      return { value, error: false };
    }

    const result = convertData(value, fieldSchema);
    return { value: result.value as FormDataPrimitive, error: result.error };
  }
}

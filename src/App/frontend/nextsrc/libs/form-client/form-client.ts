import { moveChildren } from 'nextsrc/libs/form-client/moveChildren';
import { createFormDataStore } from 'nextsrc/libs/form-client/stores/formDataStore';
import { createTextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import { createValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';

import type { StoreApi } from 'zustand';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedLayoutCollection, ResolvedLayoutFile } from 'nextsrc/libs/form-client/moveChildren';
import type { FormDataStore, FormDataStoreOptions } from 'nextsrc/libs/form-client/stores/formDataStore';
import type { TextResourceStore } from 'nextsrc/libs/form-client/stores/textResourceStore';
import type { ValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';
import type { IApplicationSettings } from 'src/types/shared';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { ILayoutCollection } from 'src/layout/layout';

export interface FormClientConfig {
  textResources?: IRawTextResource[];
  language?: string;
  applicationSettings?: IApplicationSettings | null;
  instanceDataSources?: Record<string, string> | null;
  formDataOptions?: FormDataStoreOptions;
}

export class FormClient {
  public readonly formDataStore: StoreApi<FormDataStore>;
  public readonly textResourceStore: StoreApi<TextResourceStore>;
  public readonly validationStore: StoreApi<ValidationStore>;

  private layoutCollection: ResolvedLayoutCollection = {};
  private applicationSettings: IApplicationSettings | null;
  private instanceDataSources: Record<string, string> | null;

  constructor(config: FormClientConfig = {}) {
    this.applicationSettings = config.applicationSettings ?? null;
    this.instanceDataSources = config.instanceDataSources ?? null;

    this.formDataStore = createFormDataStore(null, config.formDataOptions);
    this.textResourceStore = createTextResourceStore({
      resources: config.textResources,
      language: config.language,
    });
    this.validationStore = createValidationStore();
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

  setLayoutCollection(layoutCollection: ILayoutCollection) {
    this.layoutCollection = Object.fromEntries(
      Object.entries(layoutCollection).map(([key, layout]) => [key, moveChildren(layout)]),
    );
  }

  getFormLayout(layoutName: string): ResolvedLayoutFile {
    return this.layoutCollection[layoutName];
  }

  setApplicationSettings(settings: IApplicationSettings | null) {
    this.applicationSettings = settings;
  }

  setInstanceDataSources(sources: Record<string, string> | null) {
    this.instanceDataSources = sources;
  }
}

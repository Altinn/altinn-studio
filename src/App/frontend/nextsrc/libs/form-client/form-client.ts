import dot from 'dot-object';
import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';

import type { ILayoutFile } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

type Listener = () => void;

export class FormClient {
  private layoutCollection: ILayoutCollection;
  private formData: FormDataNode;
  private listeners = new Map<string, Set<Listener>>();

  public setFormData(formData: FormDataNode) {
    this.formData = formData;
  }

  public setLayoutCollection(layoutCollection: ILayoutCollection) {
    this.layoutCollection = layoutCollection;
  }

  getValue(path: string): FormDataPrimitive {
    if (typeof this.formData !== 'object' || this.formData === null || Array.isArray(this.formData)) {
      return null;
    }
    return (dot.pick(path, this.formData) as FormDataPrimitive) ?? null;
  }

  getFormData(): FormDataNode {
    return this.formData;
  }

  setValue(path: string, value: FormDataPrimitive): void {
    if (typeof this.formData !== 'object' || this.formData === null || Array.isArray(this.formData)) {
      return;
    }
    dot.str(path, value, this.formData);
    this.formData = { ...this.formData };
    this.notify(path);
  }

  getFormLayout(layoutName: string): ILayoutFile {
    return this.layoutCollection[layoutName];
  }

  subscribe(formId: string, listener: Listener) {
    if (!this.listeners.has(formId)) {
      this.listeners.set(formId, new Set());
    }
    this.listeners.get(formId)!.add(listener);
    return () => this.listeners.get(formId)?.delete(listener);
  }

  private notify(formId: string) {
    this.listeners.get(formId)?.forEach((fn) => fn());
    this.listeners.get('*')?.forEach((fn) => fn());
  }
}

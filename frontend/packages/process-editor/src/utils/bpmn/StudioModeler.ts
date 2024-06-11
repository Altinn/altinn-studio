import type Modeler from 'bpmn-js/lib/Modeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Element } from 'bpmn-moddle';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { type Moddle } from 'bpmn-js/lib/model/Types';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { BpmnModelerInstance } from './BpmnModelerInstance';

// Short description: This class is used to interact with the bpmn-js modeler instance to create, update and delete elements in the bpmn diagram.
// We have not written test for this class then we need to mock the BpmnModelerInstance and its methods.
enum AvailableInstances {
  Modeling = 'modeling',
  Moddle = 'moddle',
  ElementRegistry = 'elementRegistry',
}

export class StudioModeler {
  public readonly modelerInstance: Modeler = BpmnModelerInstance.getInstance();
  // TODO consider to make this private again, made public due to testing of line 50 in EditActions.tsx
  public readonly modeling: Modeling = this.modelerInstance.get(AvailableInstances.Modeling);

  private readonly moddle: Moddle = this.modelerInstance.get(AvailableInstances.Moddle);
  private readonly elementRegistry: ElementRegistry = this.modelerInstance.get(
    AvailableInstances.ElementRegistry,
  );

  private element: Element;

  constructor(element?: Element) {
    this.element = element;
  }

  public getElementId(): string {
    return this.element.id;
  }

  public getElement(id?: string): Element {
    return this.elementRegistry.get(id || this.getElementId());
  }

  public createElement<T>(elementType: string, options: T): Element {
    return this.moddle.create(elementType, { ...options });
  }

  public updateElementProperties<T>(properties: T): void {
    this.modeling.updateProperties(this.getElement(), { ...properties });
  }

  public updateModdleProperties<T>(properties: T): void {
    this.modeling.updateModdleProperties(
      this.getElement(),
      this.getElement().businessObject.extensionElements.values[0],
      { ...properties },
    );
  }

  public getAllTasksByType(elementType: string): Element[] {
    return this.elementRegistry.filter((element) => element.type === elementType);
  }
}

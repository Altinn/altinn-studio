import type Modeler from 'bpmn-js/lib/Modeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Element } from 'bpmn-moddle';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { type Moddle } from 'bpmn-js/lib/model/Types';
import { BpmnModelerInstance } from './BpmnModelerInstance';

// Short description: This class is used to interact with the bpmn-js modeler instance to create, update and delete elements in the bpmn diagram.
// We have not written test for this class then we need to mock the BpmnModelerInstance and its methods.
enum AvailableInstanceGetters {
  Modeling = 'modeling',
  Moddle = 'moddle',
  ElementRegistry = 'elementRegistry',
}

export class StudioModeler {
  private readonly modelerInstance: Modeler = BpmnModelerInstance.getInstance();
  private readonly modeling: Modeling = this.modelerInstance.get(AvailableInstanceGetters.Modeling);

  private readonly moddle: Moddle = this.modelerInstance.get(AvailableInstanceGetters.Moddle);
  private readonly elementRegistry: ElementRegistry = this.modelerInstance.get(
    AvailableInstanceGetters.ElementRegistry,
  );

  private element: Element;

  constructor(element: Element) {
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
}

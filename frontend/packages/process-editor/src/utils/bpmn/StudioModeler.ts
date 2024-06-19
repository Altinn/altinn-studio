import type Modeler from 'bpmn-js/lib/Modeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Element } from 'bpmn-moddle';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { type Moddle } from 'bpmn-js/lib/model/Types';
import { BpmnModelerInstance } from './BpmnModelerInstance';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';
import { ModdleElement } from 'bpmn-js/lib/BaseModeler';

// Short description: This class is used to interact with the bpmn-js modeler instance to create, update and delete elements in the bpmn diagram.
// We have not written test for this class then we need to mock the BpmnModelerInstance and its methods.
enum AvailableBpmnInstances {
  Modeling = 'modeling',
  Moddle = 'moddle',
  ElementRegistry = 'elementRegistry',
  BpmnFactory = 'bpmnFactory',
}

export class StudioModeler {
  public readonly modelerInstance: Modeler = BpmnModelerInstance.getInstance();
  public readonly bpmnFactory: BpmnFactory = this.modelerInstance.get(
    AvailableBpmnInstances.BpmnFactory,
  );
  // TODO consider to make this private again, made public due to testing of line 50 in EditActions.tsx
  public readonly modeling: Modeling = this.modelerInstance.get(AvailableBpmnInstances.Modeling);

  private readonly moddle: Moddle = this.modelerInstance.get(AvailableBpmnInstances.Moddle);
  private readonly elementRegistry: ElementRegistry = this.modelerInstance.get(
    AvailableBpmnInstances.ElementRegistry,
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

  public get getCurrentTaskType(): BpmnTaskType {
    const element = this.getElement();
    const bpmnAttrs = element.businessObject?.$attrs;
    return bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;
  }

  public createElement<T>(elementType: string, options: T): Element {
    return this.moddle.create(elementType, { ...options });
  }

  public updateElementProperties<T>(properties: T): void {
    this.modeling.updateProperties(this.getElement(), { ...properties });
  }

  public updateModdleProperties<T>(properties: T, element: ModdleElement): void {
    this.modeling.updateModdleProperties(this.getElement(), element, { ...properties });
  }

  public getAllTasksByType(elementType: string): Element[] {
    return this.elementRegistry.filter((element) => element.type === elementType);
  }
}

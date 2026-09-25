import type { Element, Moddle } from 'bpmn-js/lib/model/Types';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { BpmnModelerInstance } from './BpmnModelerInstance';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import type { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { TaskUtils } from '../taskUtils';

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

  private readonly modeling: Modeling = this.modelerInstance.get(AvailableBpmnInstances.Modeling);

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
    return this.elementRegistry.get(id || this.getElementId()) as Element;
  }

  public get getCurrentTaskType(): BpmnTaskType {
    return TaskUtils.getTaskExtension(this.getElement())?.taskType ?? null;
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

  public getElementsByType(elementType: BpmnTypeEnum): Element[] {
    return this.elementRegistry.filter((element) => element.type === elementType) as Element[];
  }

  /** Bpmn ids are unique across the whole document, not only within an element type. */
  public getAllElementIds(): string[] {
    return this.elementRegistry.getAll().map((element) => element.id);
  }
}

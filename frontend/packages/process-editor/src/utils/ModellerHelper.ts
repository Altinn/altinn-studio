import type Modeler from 'bpmn-js/lib/Modeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Element } from 'bpmn-moddle';
import ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { Moddle } from 'bpmn-js/lib/model/Types';
import { StudioBpmnModeler } from './StudioBpmnModeler';

// Short description: This class is used to interact with the bpmn-js modeler instance to create, update and delete elements in the bpmn diagram.
enum AvailableInstanceGetters {
  Modeling = 'modeling',
  Moddle = 'moddle',
  ElementRegistry = 'elementRegistry',
}

export class StudioModeller {
  private readonly modellerInstance: Modeler = StudioBpmnModeler.getInstance();
  private readonly modeling: Modeling = this.modellerInstance.get(
    AvailableInstanceGetters.Modeling,
  );

  private readonly moddle: Moddle = this.modellerInstance.get(AvailableInstanceGetters.Moddle);
  private readonly elementRegistry: ElementRegistry = this.modellerInstance.get(
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

  public updateElementProperties<T>(element: Element, properties: T): void {
    this.modeling.updateProperties(element, { ...properties });
  }

  // TODO expression should be a type that match our supported expressions
  public createExpressionElement(expression: string): Element {
    return this.createElement('bpmn:FormalExpression', {
      body: expression,
    });
  }

  public addChildElementToParent<T>(properties: T): void {
    this.updateElementProperties(this.getElement(), { ...properties });
  }
}

import type { Element } from 'bpmn-moddle';
import { StudioModeler } from './StudioModeler';

export class BpmnExpressionModeler extends StudioModeler {
  public get conditionExpression(): string | null {
    const expressionString = this.getElement().di.bpmnElement.conditionExpression?.body;
    return expressionString ? JSON.parse(expressionString) : null;
  }

  constructor(element: Element) {
    super(element);
  }

  public createExpressionElement(expression: string): Element {
    return this.createElement('bpmn:FormalExpression', {
      body: expression,
    });
  }

  public addChildElementToParent<T>(properties: T): void {
    this.updateElementProperties({ ...properties });
  }
}

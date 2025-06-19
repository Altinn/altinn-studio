import type { Element } from 'bpmn-moddle';
import type Modeler from 'bpmn-js/lib/Modeler';
import { type Moddle } from 'bpmn-js/lib/model/Types';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { BpmnModelerInstance } from './BpmnModelerInstance';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import { type BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';

// Short description: This class is used to interact with the bpmn-js modeler instance to create, update and delete elements in the bpmn diagram.
// We have not written test for this class then we need to mock the BpmnModelerInstance and its methods.

/*
 * Not all lines in this file are covered by tests because it would require extensive mocking of methods and classes from the bpmn-js library.
 * This effort might not be worthwhile since the package is not very type-safe, meaning our tests might not fail even if the package's API changes.
 */

enum AvailableBpmnInstances {
  Modeling = 'modeling',
  Moddle = 'moddle',
  ElementRegistry = 'elementRegistry',
  BpmnFactory = 'bpmnFactory',
}

type PaymentTaskConfig = {
  configNode: string;
  dataTypeName: string;
  receiptPdfDataTypeName: string;
};

type SigningTaskConfig = {
  configNode: string;
  dataTypeName: string;
};

type UserControlledSigningTaskConfig = {
  configNode: string;
  dataTypeName: string;
};

type BpmnTaskConfig = {
  payment: PaymentTaskConfig;
  signing: SigningTaskConfig;
  userControlledSigning: UserControlledSigningTaskConfig;
};

const bpmnTaskConfig: BpmnTaskConfig = {
  payment: {
    configNode: 'paymentConfig',
    dataTypeName: 'paymentDataType',
    receiptPdfDataTypeName: 'paymentReceiptPdfDataType',
  },
  signing: {
    configNode: 'signatureConfig',
    dataTypeName: 'signatureDataType',
  },
  userControlledSigning: {
    configNode: 'signatureConfig',
    dataTypeName: 'signatureDataType',
  },
};

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

  public getReceiptPdfDataTypeIdFromBusinessObject(
    bpmnTaskType: BpmnTaskType,
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const configNode = bpmnTaskConfig[bpmnTaskType].configNode;
    const receiptPdfDataTypeName = bpmnTaskConfig[bpmnTaskType].receiptPdfDataTypeName;
    return businessObject?.extensionElements?.values[0][configNode][receiptPdfDataTypeName];
  }

  public getDataTypeIdFromBusinessObject(
    bpmnTaskType: BpmnTaskType,
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const configNode = bpmnTaskConfig[bpmnTaskType].configNode;
    const dataTypeName = bpmnTaskConfig[bpmnTaskType].dataTypeName;
    return businessObject.extensionElements?.values[0][configNode][dataTypeName];
  }

  public getSigneeStatesDataTypeId(
    bpmnTaskType: BpmnTaskType,
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const configNode = bpmnTaskConfig[bpmnTaskType].configNode;
    const signeeStateKey = 'signeeStatesDataTypeId';
    return businessObject?.extensionElements?.values[0][configNode][signeeStateKey];
  }
}

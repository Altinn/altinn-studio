import type { Element, Moddle } from 'bpmn-js/lib/model/Types';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { BpmnModelerInstance } from './BpmnModelerInstance';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import { type BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';
import type { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { TaskUtils } from '../taskUtils';

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

type BpmnTaskConfig = {
  payment: PaymentTaskConfig;
  signing: SigningTaskConfig;
};

/**
 * The task types that keep their data types in a per-type config node. Deliberately narrower than
 * `BpmnTaskType`, which is open: a custom service task's type is an arbitrary string, and the
 * lookup below has no entry for it. Requiring this type at the call site keeps the lookup total
 * instead of letting it throw on a key it was never given.
 */
export type BpmnDataTypeCarryingTaskType = keyof BpmnTaskConfig;

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
    return this.elementRegistry.get(id || this.getElementId()) as Element;
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

  public getElementsByType(elementType: BpmnTypeEnum): Element[] {
    return this.elementRegistry.filter((element) => element.type === elementType) as Element[];
  }

  /**
   * Every id in the diagram, whatever the element type. Bpmn ids are xsd:ID, so they must be unique
   * across the whole document and not just within a type.
   */
  public getAllElementIds(): string[] {
    return this.elementRegistry.getAll().map((element) => element.id);
  }

  /** Payment is the only task type with a receipt pdf data type, so it takes no task type. */
  public getReceiptPdfDataTypeIdFromBusinessObject(
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const { configNode, receiptPdfDataTypeName } = bpmnTaskConfig.payment;
    return TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.[configNode][
      receiptPdfDataTypeName
    ];
  }

  /**
   * Signing is the only task type with a pdf data type of its own, so it takes no task type. The
   * property is optional in the schema, and the palette seeds one only on the user controlled
   * signing task, so the caller gets undefined for a signing task that generates no pdf. Whether a
   * pdf is generated follows the property alone, not the kind of signing.
   *
   * Read through the declared property rather than through {@link bpmnTaskConfig}, so that the
   * return type is one the compiler checks against `BpmnBusinessObjectEditor` instead of an
   * annotation over an index that resolves to `any`.
   */
  public getSigningPdfDataTypeIdFromBusinessObject(
    businessObject: BpmnBusinessObjectEditor,
  ): string | undefined {
    return TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.signatureConfig
      ?.signingPdfDataType;
  }

  public getDataTypeIdFromBusinessObject(
    bpmnTaskType: BpmnDataTypeCarryingTaskType,
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const configNode = bpmnTaskConfig[bpmnTaskType].configNode;
    const dataTypeName = bpmnTaskConfig[bpmnTaskType].dataTypeName;
    return TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.[configNode][dataTypeName];
  }

  public getSigneeStatesDataTypeId(
    bpmnTaskType: BpmnDataTypeCarryingTaskType,
    businessObject: BpmnBusinessObjectEditor,
  ): string {
    const configNode = bpmnTaskConfig[bpmnTaskType].configNode;
    const signeeStateKey = 'signeeStatesDataTypeId';
    return TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.[configNode][
      signeeStateKey
    ];
  }
}

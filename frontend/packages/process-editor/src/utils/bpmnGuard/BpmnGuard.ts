import type { Element } from 'bpmn-moddle';

export enum GuardErrorMessage {
  MissingSignature = 'Missing signature config in BPMN extension element',
  MissingExtensionElement = 'Missing extension elements in BPMN businessObject',
}

// Guards ensure required BPMN structure is present before continuing logic, throwing early if assumptions fail.
export class BpmnGuard {
  public static ensureHasSignatureConfig(element: Element): void {
    BpmnGuard.ensureExtensionElementBusinessObject(element);

    const signatureConfig = element.businessObject.extensionElements.values[0]?.signatureConfig;
    if (!signatureConfig) {
      throw new Error(GuardErrorMessage.MissingSignature);
    }
  }

  public static ensureExtensionElementBusinessObject(element: Element): void {
    const businessObject = element?.businessObject;
    if (!businessObject?.extensionElements?.values?.length) {
      throw new Error(GuardErrorMessage.MissingExtensionElement);
    }
  }
}

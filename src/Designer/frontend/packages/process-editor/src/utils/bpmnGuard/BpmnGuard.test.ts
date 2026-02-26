import { BpmnGuard, GuardErrorMessage } from './BpmnGuard';
import type { Element } from 'bpmn-js/lib/model/Types';

describe('BpmnGuard', () => {
  describe('ensureExtensionElementBusinessObject', () => {
    it('throws if extensionElements are missing', () => {
      const element = { businessObject: {} } as Element;
      expect(() => BpmnGuard.ensureExtensionElementBusinessObject(element)).toThrow(
        GuardErrorMessage.MissingExtensionElement,
      );
    });

    it('does not throw if extensionElements have values', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [{}],
          },
        },
      } as Element;

      expect(() => BpmnGuard.ensureExtensionElementBusinessObject(element)).not.toThrow();
    });
  });

  describe('ensureHasSignatureConfig', () => {
    it('throws if signatureConfig is missing', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [{}], // no signatureConfig here
          },
        },
      } as Element;

      expect(() => BpmnGuard.ensureHasSignatureConfig(element)).toThrow(
        GuardErrorMessage.MissingSignature,
      );
    });

    it('does not throw if signatureConfig is present', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [
              {
                signatureConfig: { dataTypesToSign: [] },
              },
            ],
          },
        },
      } as Element;

      expect(() => BpmnGuard.ensureHasSignatureConfig(element)).not.toThrow();
    });
  });
});

import { useMemo } from 'react';

import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import { implementsAnyValidation, implementsValidateComponent, implementsValidateEmptyField } from 'src/layout';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { ComponentValidations, ValidationDataSources } from 'src/features/validation';

const __default__ = {};

/**
 * Runs validations defined in the component classes
 */
export function useNodeValidation(): ComponentValidations {
  const validationDataSources = useValidationDataSources();
  const nodesRef = useAsRef(useNodes());

  return useMemo(() => {
    const nodes = nodesRef.current.allNodes();
    const nodesToValidate = nodes.filter(
      (node) => implementsAnyValidation(node.def) && !('renderAsSummary' in node.item && node.item.renderAsSummary),
    );

    if (nodesToValidate.length === 0) {
      return __default__;
    }

    const validations: ComponentValidations = {};
    for (const node of nodesToValidate) {
      validations[node.item.id] = {
        component: [],
        bindingKeys: node.item.dataModelBindings
          ? Object.fromEntries(Object.keys(node.item.dataModelBindings).map((key) => [key, []]))
          : {},
      };

      /**
       * Run required validation
       */
      if (implementsValidateEmptyField(node.def)) {
        for (const validation of node.def.runEmptyFieldValidation(node as any, validationDataSources)) {
          if (validation.bindingKey) {
            validations[node.item.id].bindingKeys[validation.bindingKey].push(validation);
          } else {
            validations[node.item.id].component.push(validation);
          }
        }
      }

      /**
       * Run component validation
       */
      if (implementsValidateComponent(node.def)) {
        for (const validation of node.def.runComponentValidation(node as any, validationDataSources)) {
          if (validation.bindingKey) {
            validations[node.item.id].bindingKeys[validation.bindingKey].push(validation);
          } else {
            validations[node.item.id].component.push(validation);
          }
        }
      }
    }
    return validations;
  }, [nodesRef, validationDataSources]);
}

/**
 * Hook providing validation data sources
 */
export function useValidationDataSources(): ValidationDataSources {
  const formData = FD.useDebounced();
  const attachments = useAttachments();
  const currentLanguage = useCurrentLanguage();

  return useMemo(
    () => ({
      formData,
      attachments,
      currentLanguage,
    }),
    [attachments, currentLanguage, formData],
  );
}

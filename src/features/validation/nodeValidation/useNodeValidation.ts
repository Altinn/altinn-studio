import { useMemo } from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useAttachmentsSelector } from 'src/features/attachments/hooks';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { Validation } from 'src/features/validation/validationContext';
import { implementsValidateComponent, implementsValidateEmptyField } from 'src/layout';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, BaseValidation, ValidationDataSources } from 'src/features/validation';
import type { CompDef, ValidationFilter } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

/**
 * Runs validations defined in the component classes. This runs from the node generator, and will collect all
 * validations for a node and return them.
 */
export function useNodeValidation(node: LayoutNode, shouldValidate: boolean): AnyValidation[] {
  const dataModelSelector = Validation.useDataModelSelector();
  const validationDataSources = useValidationDataSources();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const getDataElementIdForDataType = DataModels.useGetDataElementIdForDataType();

  return useMemo(() => {
    const validations: AnyValidation[] = [];
    if (!shouldValidate) {
      return validations;
    }

    if (implementsValidateEmptyField(node.def)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validations.push(...node.def.runEmptyFieldValidation(node as any, validationDataSources));
    }

    if (implementsValidateComponent(node.def)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validations.push(...node.def.runComponentValidation(node as any, validationDataSources));
    }

    const dataModelBindings = validationDataSources.nodeDataSelector(
      (picker) => picker(node)?.layout.dataModelBindings,
      [node],
    );
    for (const [bindingKey, { dataType, field }] of Object.entries(
      (dataModelBindings ?? {}) as Record<string, IDataModelReference>,
    )) {
      const dataElementId = getDataElementIdForDataType(dataType) ?? dataType; // stateless does not have dataElementId
      const fieldValidations = dataModelSelector((dataModels) => dataModels[dataElementId]?.[field], [dataType, field]);
      if (fieldValidations) {
        validations.push(...fieldValidations.map((v) => ({ ...v, node, bindingKey })));
      }
    }

    return filter(validations, node, nodeDataSelector);
  }, [shouldValidate, node, validationDataSources, nodeDataSelector, getDataElementIdForDataType, dataModelSelector]);
}

/**
 * Hook providing validation data sources
 */
function useValidationDataSources(): ValidationDataSources {
  const formDataSelector = FD.useDebouncedSelector();
  const invalidDataSelector = FD.useInvalidDebouncedSelector();
  const attachmentsSelector = useAttachmentsSelector();
  const currentLanguage = useCurrentLanguage();
  const nodeSelector = NodesInternal.useNodeDataSelector();
  const applicationMetadata = useApplicationMetadata();
  const instance = useLaxInstanceData();
  const layoutSets = useLayoutSets();
  const dataElementHasErrorsSelector = Validation.useDataElementHasErrorsSelector();

  return useMemo(
    () => ({
      formDataSelector,
      invalidDataSelector,
      attachmentsSelector,
      currentLanguage,
      nodeDataSelector: nodeSelector,
      applicationMetadata,
      instance,
      layoutSets,
      dataElementHasErrorsSelector,
    }),
    [
      formDataSelector,
      invalidDataSelector,
      attachmentsSelector,
      currentLanguage,
      nodeSelector,
      applicationMetadata,
      instance,
      layoutSets,
      dataElementHasErrorsSelector,
    ],
  );
}

/**
 * Filters a list of validations based on the validation filters of a node
 */
function filter<Validation extends BaseValidation>(
  validations: Validation[],
  node: LayoutNode,
  selector: NodeDataSelector,
): Validation[] {
  if (!implementsValidationFilter(node.def)) {
    return validations;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters = node.def.getValidationFilters(node as any, selector);
  if (filters.length == 0) {
    return validations;
  }

  const out: Validation[] = [];
  validationsLoop: for (let i = 0; i < validations.length; i++) {
    for (const filter of filters) {
      if (!filter(validations[i], i, validations)) {
        // Skip validation if any filter returns false
        continue validationsLoop;
      }
    }
    out.push(validations[i]);
  }
  return out;
}

function implementsValidationFilter<Def extends CompDef>(def: Def): def is Def & ValidationFilter {
  return 'getValidationFilters' in def;
}

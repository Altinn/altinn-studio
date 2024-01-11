import { getSchemaValidationErrors } from 'src/features/validation/frontend/schemaValidation';
import { mergeFormValidations } from 'src/features/validation/utils';
import { implementsAnyValidation } from 'src/layout';
import type { FormValidations, ValidationDataSources } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function runValidationOnNodes(nodes: LayoutNode[], context: ValidationDataSources): FormValidations {
  const nodesToValidate = nodes.filter(
    (node) => implementsAnyValidation(node.def) && !('renderAsSummary' in node.item && node.item.renderAsSummary),
  );

  const validations: FormValidations = {
    fields: {},
    components: {},
  };

  if (nodesToValidate.length === 0) {
    return validations;
  }

  const schemaErrors = getSchemaValidationErrors(context);

  for (const node of nodesToValidate) {
    if (implementsAnyValidation(node.def)) {
      mergeFormValidations(validations, node.def.runValidations(node as any, context, schemaErrors));
    }
  }

  return validations;
}

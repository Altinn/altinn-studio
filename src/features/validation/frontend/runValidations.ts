import { getSchemaValidationErrors } from 'src/features/validation/frontend/schemaValidation';
import { implementsAnyValidation } from 'src/layout';
import type { FrontendValidations, ValidationDataSources } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function runValidationOnNodes(nodes: LayoutNode[], context: ValidationDataSources): FrontendValidations[] {
  const nodesToValidate = nodes.filter(
    (node) => implementsAnyValidation(node.def) && !('renderAsSummary' in node.item && node.item.renderAsSummary),
  );

  const validations: FrontendValidations[] = [];

  if (nodesToValidate.length === 0) {
    return validations;
  }

  const schemaErrors = getSchemaValidationErrors(context);

  for (const node of nodesToValidate) {
    if (implementsAnyValidation(node.def)) {
      validations.push(node.def.runValidations(node as any, context, schemaErrors));
    }
  }

  return validations;
}

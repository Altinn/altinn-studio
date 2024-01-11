import { implementsValidateComponent, implementsValidateEmptyField, implementsValidateSchema } from '.';

import { FrontendValidationSource } from 'src/features/validation';
import { runExpressionValidationsOnNode } from 'src/features/validation/frontend/expressionValidation';
import { isComponentValidation, isFieldValidation } from 'src/features/validation/utils';
import type {
  ComponentValidation,
  FieldValidation,
  FormValidations,
  ISchemaValidationError,
  ValidationDataSources,
} from 'src/features/validation';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

// TODO(Validation): Merge all frontend validations into one group?
export function runAllValidations<Type extends CompTypes>(
  node: LayoutNode<Type>,
  ctx: ValidationDataSources,
  schemaErrors: ISchemaValidationError[],
): FormValidations {
  const formValidations: FormValidations = {
    fields: {},
    components: {
      [node.item.id]: {
        bindingKeys: {},
        component: {
          [FrontendValidationSource.EmptyField]: [],
          [FrontendValidationSource.Component]: [],
          [FrontendValidationSource.Schema]: [],
          [FrontendValidationSource.Expression]: [],
        },
      },
    },
  };

  if (node.item.dataModelBindings) {
    for (const [bindingKey, field] of Object.entries(node.item.dataModelBindings)) {
      formValidations.fields[field] = {
        [FrontendValidationSource.EmptyField]: [],
        [FrontendValidationSource.Component]: [],
        [FrontendValidationSource.Schema]: [],
        [FrontendValidationSource.Expression]: [],
      };
      formValidations.components[node.item.id].bindingKeys[bindingKey] = {
        [FrontendValidationSource.EmptyField]: [],
        [FrontendValidationSource.Component]: [],
        [FrontendValidationSource.Schema]: [],
        [FrontendValidationSource.Expression]: [],
      };
    }
  }

  const validations: (FieldValidation | ComponentValidation)[] = [];
  if (implementsValidateEmptyField(node.def)) {
    validations.push(...node.def.runEmptyFieldValidation(node as any, ctx));
  }
  if (implementsValidateComponent(node.def)) {
    validations.push(...node.def.runComponentValidation(node as any, ctx));
  }
  if (implementsValidateSchema(node.def)) {
    validations.push(...node.def.runSchemaValidation(node as any, schemaErrors));
  }
  validations.push(...runExpressionValidationsOnNode(node, ctx));

  for (const validation of validations) {
    if (isFieldValidation(validation)) {
      formValidations.fields[validation.field][validation.group].push(validation);
    } else if (isComponentValidation(validation)) {
      if (validation.bindingKey) {
        formValidations.components[node.item.id].bindingKeys[validation.bindingKey][validation.group].push(validation);
      } else {
        formValidations.components[node.item.id].component[validation.group].push(validation);
      }
    }
  }

  return formValidations;
}

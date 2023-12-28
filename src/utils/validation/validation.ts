import {
  implementsAnyValidation,
  implementsComponentValidation,
  implementsEmptyFieldValidation,
  implementsSchemaValidation,
} from 'src/layout';
import { runExpressionValidationsOnNode } from 'src/utils/validation/expressionValidation';
import { getSchemaValidationErrors } from 'src/utils/validation/schemaValidation';
import { emptyValidation } from 'src/utils/validation/validationHelpers';
import type { IAttachments, UploadedAttachment } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CompInternal } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  IComponentValidations,
  ILayoutValidations,
  IValidationObject,
  IValidationResult,
  IValidations,
  ValidationContextGenerator,
} from 'src/utils/validation/types';

export interface IValidationOptions {
  overrideFormData?: IFormData;
  skipSchemaValidation?: boolean;
  skipComponentValidation?: boolean;
  skipEmptyFieldValidation?: boolean;
  skipCustomValidation?: boolean;
}
/**
 * Runs all frontend validations on a list of nodes, and optionally skips some types of validations.
 * overrideFormData can be used to validate new data before saving.
 */
export function runValidationOnNodes(
  nodes: LayoutNode[],
  ctxGenerator: ValidationContextGenerator,
  options?: IValidationOptions,
): IValidationObject[] {
  const basicContext = ctxGenerator(undefined);
  const nodesToValidate = nodes.filter(
    (node) =>
      implementsAnyValidation(node.def) &&
      !node.isHidden({ respectTracks: true }) &&
      !('renderAsSummary' in node.item && node.item.renderAsSummary),
  );

  if (nodesToValidate.length === 0) {
    return [];
  }

  const schemaErrors = !options?.skipSchemaValidation
    ? getSchemaValidationErrors(basicContext, options?.overrideFormData)
    : [];

  const validations: IValidationObject[] = [];
  for (const node of nodesToValidate) {
    const nodeValidations: IValidationObject[] = [];
    const nodeContext = ctxGenerator(node);

    if (implementsEmptyFieldValidation(node.def) && !options?.skipEmptyFieldValidation) {
      nodeValidations.push(...node.def.runEmptyFieldValidation(node as any, nodeContext, options?.overrideFormData));
    }

    if (implementsComponentValidation(node.def) && !options?.skipComponentValidation) {
      nodeValidations.push(...node.def.runComponentValidation(node as any, nodeContext, options?.overrideFormData));
    }

    if (implementsSchemaValidation(node.def) && !options?.skipSchemaValidation) {
      nodeValidations.push(...node.def.runSchemaValidation(node as any, schemaErrors));
    }

    if (nodeContext.customValidation && !options?.skipCustomValidation) {
      nodeValidations.push(...runExpressionValidationsOnNode(node, nodeContext, options?.overrideFormData));
    }

    if (nodeValidations.length) {
      validations.push(...nodeValidations);
    } else {
      validations.push(emptyValidation(node));
    }
  }

  return validations;
}

export function attachmentsValid(
  attachments: IAttachments,
  component: CompInternal<'FileUpload' | 'FileUploadWithTag'>,
): boolean {
  if (component.minNumberOfAttachments === 0) {
    return true;
  }

  const attachmentsForComponent = attachments[component.id];
  if (!attachmentsForComponent) {
    return false;
  }

  return attachmentsForComponent.length >= component.minNumberOfAttachments;
}

export function attachmentIsMissingTag(attachment: UploadedAttachment): boolean {
  return attachment.data.tags === undefined || attachment.data.tags.length === 0;
}

/**
 * Checks if form can be saved. If it contains anything other than valid error messages it returns false
 */
export function canFormBeSaved(validationResult: IValidationResult | null): boolean {
  if (validationResult && validationResult.invalidDataTypes) {
    return false;
  }

  const validations = validationResult?.validations;
  if (!validations) {
    return true;
  }
  return Object.keys(validations).every(
    (layoutId: string) =>
      Object.keys(validations[layoutId])?.every((componentId: string) => {
        const componentValidations: IComponentValidations = validations[layoutId][componentId];
        if (componentValidations === null) {
          return true;
        }
        return Object.keys(componentValidations).every((bindingKey: string) => {
          const componentErrors = componentValidations[bindingKey]?.errors;
          return !componentErrors || componentErrors.length === 0;
        });
      }),
  );
}

/**
 * gets unmapped errors from validations as string array
 * @param validations the validations
 */
export function getUnmappedErrors(validations: IValidations): string[] {
  const messages: string[] = [];
  if (!validations) {
    return messages;
  }
  Object.keys(validations).forEach((layout: string) => {
    Object.keys(validations[layout]?.unmapped || {}).forEach((key: string) => {
      validations[layout].unmapped[key]?.errors?.forEach((message) => {
        messages.push(message);
      });
    });
  });
  return messages;
}

export interface FlatError {
  layout: string;
  componentId: string;
  message: string;
}

/**
 * Gets all mapped errors as flat array
 */
export const getMappedErrors = (validations: IValidations): FlatError[] => {
  const errors: FlatError[] = [];

  for (const layout in validations) {
    for (const componentId in validations[layout]) {
      if (componentId === 'unmapped') {
        continue;
      }

      const validationObject = validations[layout][componentId];
      for (const fieldKey in validationObject) {
        for (const message of validationObject[fieldKey]?.errors || []) {
          errors.push({
            layout,
            componentId,
            message,
          });
        }
      }
    }
  }

  return errors;
};

/**
 * Returns true if there are errors in the form at all (faster than getting all mapped/unmapped errors)
 * When this returns true, ErrorReport.tsx should be displayed
 */
export const getFormHasErrors = (validations: IValidations): boolean => {
  for (const layout in validations) {
    for (const key in validations[layout]) {
      const validationObject = validations[layout][key];
      for (const fieldKey in validationObject) {
        const fieldValidationErrors = validationObject[fieldKey]?.errors;
        if (fieldValidationErrors && fieldValidationErrors.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
};

export function missingFieldsInLayoutValidations(
  layoutValidations: ILayoutValidations,
  requiredValidationTextResources: string[],
  langTools: IUseLanguage,
): boolean {
  let result = false;
  let requiredMessage = langTools.langAsString('form_filler.error_required');
  // Strip away parametrized part of error message, as this will vary with each component.
  requiredMessage = requiredMessage.substring(0, requiredMessage.indexOf('{0}'));
  const lookForRequiredMsg = (e: any) => {
    if (typeof e === 'string') {
      return e.includes(requiredMessage);
    }
    if (Array.isArray(e)) {
      return e.findIndex(lookForRequiredMsg) > -1;
    }
    return (e?.props?.children as string).includes(requiredMessage);
  };

  Object.keys(layoutValidations).forEach((component: string) => {
    if (!layoutValidations[component] || result) {
      return;
    }
    Object.keys(layoutValidations[component]).forEach((binding: string) => {
      if (!layoutValidations[component][binding] || result) {
        return;
      }

      const errors = layoutValidations[component][binding]?.errors;

      const customRequiredValidationMessageExists = errors?.some((error) =>
        requiredValidationTextResources.includes(error),
      );

      result = !!(
        (errors && errors.length > 0 && errors.findIndex(lookForRequiredMsg) > -1) ||
        customRequiredValidationMessageExists
      );
    });
  });

  return result;
}

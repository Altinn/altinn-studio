import {
  type BaseValidation,
  type ComponentValidation,
  type FieldValidation,
  type FormValidations,
  type GroupedValidation,
  type NodeValidation,
  type ValidationGroup,
  ValidationMask,
  type ValidationMaskKeys,
  type ValidationSeverity,
  type ValidationState,
} from 'src/features/validation';
import type { IAttachments, UploadedAttachment } from 'src/features/attachments';
import type { CompInternal } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export function isFieldValidation(validation: ComponentValidation | FieldValidation): validation is FieldValidation {
  return 'field' in validation;
}

export function isComponentValidation(
  validation: ComponentValidation | FieldValidation,
): validation is ComponentValidation {
  return 'componentId' in validation;
}

export function mergeFormValidations(dest: FormValidations | ValidationState, src: FormValidations | ValidationState) {
  for (const [field, groups] of Object.entries(src.fields)) {
    if (!dest.fields[field]) {
      dest.fields[field] = {};
    }
    for (const [group, validations] of Object.entries(groups)) {
      dest.fields[field][group] = validations;
    }
  }

  for (const [componentId, compValidations] of Object.entries(src.components)) {
    if (!dest.components[componentId]) {
      dest.components[componentId] = {
        bindingKeys: {},
        component: {},
      };
    }

    if (compValidations.component) {
      for (const [group, validations] of Object.entries(compValidations.component)) {
        dest.components[componentId].component[group] = validations;
      }
    }

    if (compValidations.bindingKeys) {
      for (const [bindingKey, groups] of Object.entries(compValidations.bindingKeys)) {
        if (!dest.components[componentId].bindingKeys[bindingKey]) {
          dest.components[componentId].bindingKeys[bindingKey] = {};
        }
        for (const [group, validations] of Object.entries(groups)) {
          dest.components[componentId].bindingKeys[bindingKey][group] = validations;
        }
      }
    }
  }
}

function isOfSeverity<V extends BaseValidation, S extends ValidationSeverity>(severity: S) {
  return (validation: V): validation is V & { severity: S } => validation.severity === severity;
}
export function validationsOfSeverity<I extends BaseValidation, S extends ValidationSeverity>(
  validations: I[] | undefined,
  severity: S,
) {
  return validations?.filter(isOfSeverity(severity)) ?? [];
}

export function hasValidationErrors<V extends BaseValidation>(validations: V[] | undefined): boolean {
  return validations?.some((validation: any) => validation.severity === 'error') ?? false;
}

export function buildNodeValidation<Severity extends ValidationSeverity = ValidationSeverity>(
  node: LayoutNode,
  validation: FieldValidation<Severity> | ComponentValidation<Severity>,
  bindingKey?: string,
): NodeValidation<Severity> {
  return {
    ...validation,
    bindingKey,
    componentId: node.item.id,
    pageKey: node.pageKey(),
  };
}

/**
 * This can be used in a filter to remove hidden nodes from consideration when checking for validation errors
 */
export function shouldValidateNode(node: LayoutNode): boolean {
  return !node.isHidden({ respectTracks: true }) && !('renderAsSummary' in node.item && node.item.renderAsSummary);
}

function isValidationVisible<T extends BaseValidation>(validation: T, mask: number): boolean {
  if (validation.category === 0) {
    return true;
  }
  return (mask & validation.category) > 0;
}

export function validationsFromGroups<T extends GroupedValidation>(
  groups: ValidationGroup<T>,
  mask: number,
  severity?: ValidationSeverity,
) {
  const validationsFlat = Object.values(groups).flat();

  const filteredValidations = severity ? validationsOfSeverity(validationsFlat, severity) : validationsFlat;
  return filteredValidations.filter((validation) => isValidationVisible(validation, mask));
}

/*
 * Gets all validations for a node in a single list, optionally filtered by severity
 * Looks at data model bindings to get field validations
 */
export function getValidationsForNode(node: LayoutNode, state: ValidationState, mask: number): NodeValidation[];
export function getValidationsForNode<Severity extends ValidationSeverity>(
  node: LayoutNode,
  state: ValidationState,
  mask: number,
  severity: Severity,
): NodeValidation<Severity>[];
export function getValidationsForNode(
  node: LayoutNode,
  state: ValidationState,
  mask: number,
  severity?: ValidationSeverity,
): NodeValidation[] {
  const validationMessages: NodeValidation[] = [];
  if (!shouldValidateNode(node)) {
    return validationMessages;
  }

  if (node.item.dataModelBindings) {
    for (const [bindingKey, field] of Object.entries(node.item.dataModelBindings)) {
      if (state.fields[field]) {
        const validations = validationsFromGroups(state.fields[field], mask, severity);
        for (const validation of validations) {
          validationMessages.push(buildNodeValidation(node, validation, bindingKey));
        }
      }

      if (state.components[node.item.id]?.bindingKeys?.[bindingKey]) {
        const validations = validationsFromGroups(
          state.components[node.item.id].bindingKeys[bindingKey],
          mask,
          severity,
        );
        for (const validation of validations) {
          validationMessages.push(buildNodeValidation(node, validation, bindingKey));
        }
      }
    }
  }
  if (state.components[node.item.id]?.component) {
    const validations = validationsFromGroups(state.components[node.item.id].component, mask, severity);
    for (const validation of validations) {
      validationMessages.push(buildNodeValidation(node, validation));
    }
  }
  return validationMessages;
}

export function getInitialMaskFromNode(node: LayoutNode | LayoutPage): number {
  if ('showValidations' in node.item) {
    return getVisibilityMask(node.item.showValidations);
  }
  return 0;
}

export function getVisibilityMask(maskKeys?: ValidationMaskKeys[]): number {
  let mask = 0;
  if (!maskKeys) {
    return mask;
  }
  for (const maskKey of maskKeys) {
    mask |= ValidationMask[maskKey];
  }
  return mask;
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
 * Updates an existing validation states using the values from the new state.
 */
export function mergeValidationState(prevState: ValidationState, newState: ValidationState): void {
  mergeFormValidations(prevState, newState);

  if (newState.task) {
    prevState.task = newState.task;
  }
}

/**
 * Remove validation from removed nodes.
 * This also removes field validations which are no longer bound to any other nodes.
 */
export function purgeValidationsForNodes(
  state: FormValidations,
  removedNodes: LayoutNode[],
  currentNodes: LayoutNode[],
): void {
  if (removedNodes.length === 0) {
    return;
  }

  const fieldsToKeep = new Set<string>();
  for (const node of currentNodes) {
    if (node.item.dataModelBindings) {
      for (const field of Object.values(node.item.dataModelBindings)) {
        fieldsToKeep.add(field);
      }
    }
  }

  for (const node of removedNodes) {
    delete state.components[node.item.id];
    if (node.item.dataModelBindings) {
      for (const field of Object.values(node.item.dataModelBindings)) {
        if (!fieldsToKeep.has(field)) {
          delete state.fields[field];
        }
      }
    }
  }
}

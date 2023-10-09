import {
  implementsAnyValidation,
  implementsComponentValidation,
  implementsEmptyFieldValidation,
  implementsSchemaValidation,
} from 'src/layout';
import { groupIsRepeatingExt } from 'src/layout/Group/tools';
import { runExpressionValidationsOnNode } from 'src/utils/validation/expressionValidation';
import { getSchemaValidationErrors } from 'src/utils/validation/schemaValidation';
import { emptyValidation } from 'src/utils/validation/validationHelpers';
import type { IAttachment } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { CompOrGroupExternal, ILayout, ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';
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

/**
 * @deprecated
 * @see useExprContext
 * @see useResolvedNode
 * @see ResolvedNodesSelector
 */
export function getParentGroup(groupId: string, layout: ILayout): CompGroupExternal | undefined {
  if (!groupId || !layout) {
    return undefined;
  }
  return layout.find((element) => {
    if (element.id !== groupId && element.type === 'Group') {
      const childrenWithoutMultiPage = element.children?.map((childId) =>
        groupIsRepeatingExt(element) && element.edit?.multiPage ? childId.split(':')[1] : childId,
      );
      if (childrenWithoutMultiPage?.indexOf(groupId) > -1) {
        return true;
      }
    }
    return false;
  }) as CompGroupExternal | undefined;
}

/**
 * @deprecated
 * @see useExprContext
 * @see useResolvedNode
 * @see ResolvedNodesSelector
 */
export function getGroupChildren(groupId: string, layout: ILayout): CompOrGroupExternal[] {
  const layoutGroup = layout.find((element) => element.id === groupId) as CompGroupExternal;
  return layout.filter(
    (element) =>
      layoutGroup?.children
        ?.map((id) => (groupIsRepeatingExt(layoutGroup) && layoutGroup.edit?.multiPage ? id.split(':')[1] : id))
        .includes(element.id),
  );
}

export function attachmentsValid(attachments: any, component: any): boolean {
  return (
    component.minNumberOfAttachments === 0 ||
    (attachments && attachments[component.id] && attachments[component.id].length >= component.minNumberOfAttachments)
  );
}

export function attachmentIsMissingTag(attachment: IAttachment): boolean {
  return attachment.tags === undefined || attachment.tags.length === 0;
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

/*
 * Removes the validations for a given group index and shifts higher indexes if necessary.
 * @param id the group id
 * @param index the index to remove
 * @param currentLayout the current layout
 * @param layout the layout state
 * @param repeatingGroups the repeating groups
 * @param validations the current validations
 * @returns a new validation object with the validations for the given group index removed
 */
export function removeGroupValidationsByIndex(
  id: string,
  index: number,
  currentLayout: string,
  layout: ILayouts,
  repeatingGroups: IRepeatingGroups,
  validations: IValidations,
  shift = true,
): IValidations {
  if (!validations[currentLayout]) {
    return validations;
  }
  let result = JSON.parse(JSON.stringify(validations));
  const indexedId = `${id}-${index}`;
  const repeatingGroup = repeatingGroups[id];
  delete result[currentLayout][indexedId];
  const children = getGroupChildren(repeatingGroup.baseGroupId || id, layout[currentLayout] || []);
  const parentGroup = getParentGroup(repeatingGroup.baseGroupId || id, layout[currentLayout] || []);

  // Remove validations for child elements on given index
  children?.forEach((element) => {
    let childKey;
    if (parentGroup) {
      const splitId = id.split('-');
      const parentIndex = splitId[splitId.length - 1];
      childKey = `${element.id}-${parentIndex}-${index}`;
    } else {
      childKey = `${element.id}-${index}`;
    }
    if (element.type !== 'Group') {
      // delete component directly
      delete result[currentLayout][childKey];
    } else {
      // recursively call delete if we have a child group
      const childGroupCount = repeatingGroups[`${element.id}-${index}`]?.index;
      for (let i = 0; i <= childGroupCount; i++) {
        result = removeGroupValidationsByIndex(
          `${element.id}-${index}`,
          i,
          currentLayout,
          layout,
          repeatingGroups,
          result,
          false,
        );
      }
    }
  });

  // Shift validations if necessary
  if (shift && index < repeatingGroup.index + 1) {
    for (let i = index + 1; i <= repeatingGroup.index + 1; i++) {
      const key = `${id}-${i}`;
      const newKey = `${id}-${i - 1}`;
      delete result[currentLayout][key];
      result[currentLayout][newKey] = validations[currentLayout][key];
      children?.forEach((element) => {
        let childKey;
        let shiftKey;
        if (parentGroup) {
          const splitId = id.split('-');
          const parentIndex = splitId[splitId.length - 1];
          childKey = `${element.id}-${parentIndex}-${i}`;
          shiftKey = `${element.id}-${parentIndex}-${i - 1}`;
        } else {
          childKey = `${element.id}-${i}`;
          shiftKey = `${element.id}-${i - 1}`;
        }
        if (element.type !== 'Group') {
          delete result[currentLayout][childKey];
          result[currentLayout][shiftKey] = validations[currentLayout][childKey];
        } else {
          result = shiftChildGroupValidation(
            element,
            i,
            result,
            repeatingGroups,
            layout[currentLayout] || [],
            currentLayout,
          );
        }
      });
    }
  }

  return result;
}

function shiftChildGroupValidation(
  group: CompGroupExternal,
  indexToShiftFrom: number,
  validations: IValidations,
  repeatingGroups: IRepeatingGroups,
  layout: ILayout,
  currentLayout: string,
) {
  const result = structuredClone(validations);
  const highestIndexOfChildGroup = getHighestIndexOfChildGroup(group.id, repeatingGroups);
  const children = getGroupChildren(group.id, layout);

  for (let i = indexToShiftFrom; i <= highestIndexOfChildGroup + 1; i++) {
    const givenIndexCount = repeatingGroups[`${group.id}-${i}`]?.index ?? -1;
    for (let childIndex = 0; childIndex < givenIndexCount + 1; childIndex++) {
      const childGroupKey = `${group.id}-${i}-${childIndex}`;
      const shiftGroupKey = `${group.id}-${i - 1}-${childIndex}`;
      delete result[currentLayout][childGroupKey];
      result[currentLayout][shiftGroupKey] = validations[currentLayout][childGroupKey];
      children?.forEach((child) => {
        const childKey = `${child.id}-${i}-${childIndex}`;
        const shiftKey = `${child.id}-${i - 1}-${childIndex}`;
        delete result[currentLayout][childKey];
        result[currentLayout][shiftKey] = validations[currentLayout][childKey];
      });
    }
  }
  return result;
}

export function getHighestIndexOfChildGroup(group: string, repeatingGroups: IRepeatingGroups) {
  if (!group || !repeatingGroups) {
    return -1;
  }
  let index = 0;
  while (repeatingGroups[`${group}-${index}`]?.index !== undefined) {
    index += 1;
  }
  return index - 1;
}

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

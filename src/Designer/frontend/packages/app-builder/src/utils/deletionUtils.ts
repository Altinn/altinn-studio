import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent, PageLayouts } from '../types';
import { getFieldNames } from './dataModelUtils';

/** The layouts of every layout set in the app, keyed by layout set name. */
export type AllLayouts = Record<string, PageLayouts>;

export type ComponentReference = {
  layoutSetName: string;
  pageName: string;
  component: LayoutComponent;
};

export type RemovableItem = {
  /** The text resource key or the data model field name. */
  name: string;
  /** Other components that use the item. When there are any, the item cannot be removed. */
  usedBy: ComponentReference[];
  isSelectedByDefault: boolean;
  /** Set for a field when the app may be published, so answers may be stored in it. */
  mayHaveStoredAnswers?: boolean;
};

export type DeletionCandidates = {
  texts: RemovableItem[];
  fields: RemovableItem[];
};

export type DeletionContext = {
  component: LayoutComponent;
  layoutSetName: string;
  allLayouts: AllLayouts;
  /** The app's own texts in the edited language. */
  existingTextKeys: string[];
  dataModel?: { dataType: string; schema: JsonSchema };
  /** Undefined when it is not known whether the app has been published. */
  isPublished?: boolean;
};

/**
 * Works out what may be removed together with a component, and what should be selected by default:
 * whatever only this component uses. A field is only selected by default when the app has never
 * been published, since answers may be stored in it.
 */
export function getDeletionCandidates({
  component,
  layoutSetName,
  allLayouts,
  existingTextKeys,
  dataModel,
  isPublished,
}: DeletionContext): DeletionCandidates {
  const isOtherComponent = (reference: ComponentReference): boolean =>
    !(reference.layoutSetName === layoutSetName && reference.component.id === component.id);

  const texts = getOwnTextKeys(component)
    .filter((textKey) => existingTextKeys.includes(textKey))
    .map((textKey) => {
      const usedBy = findReferences(allLayouts, (other) => usesText(other, textKey)).filter(
        isOtherComponent,
      );
      return { name: textKey, usedBy, isSelectedByDefault: usedBy.length === 0 };
    });

  const existingFields = getFieldNames(dataModel?.schema);
  const mayHaveStoredAnswers = isPublished !== false;
  const fields = getOwnFieldNames(component, dataModel?.dataType)
    .filter((fieldName) => existingFields.includes(fieldName))
    .map((fieldName) => {
      const usedBy = findReferences(allLayouts, (other) => usesField(other, fieldName)).filter(
        isOtherComponent,
      );
      return {
        name: fieldName,
        usedBy,
        isSelectedByDefault: usedBy.length === 0 && !mayHaveStoredAnswers,
        mayHaveStoredAnswers,
      };
    });

  return { texts, fields };
}

/** The text resource keys the component's own texts and options point to. */
export function getOwnTextKeys(component: LayoutComponent): string[] {
  const bindings = Object.values(component.textResourceBindings ?? {});
  const options: unknown[] = Array.isArray(component.options) ? component.options : [];
  const optionTexts = options.flatMap((option: Record<string, unknown>) => [
    option.label,
    option.description,
    option.helpText,
  ]);
  const keys = [...bindings, ...optionTexts].filter(
    (key): key is string => typeof key === 'string' && key !== '',
  );
  return Array.from(new Set(keys));
}

/**
 * The data model fields the component saves to. A binding without a data type uses the layout set's
 * default data type, so it is counted as the data model's own.
 */
export function getOwnFieldNames(
  component: LayoutComponent,
  dataType: string | undefined,
): string[] {
  const bindings: unknown[] = Object.values(component.dataModelBindings ?? {});
  const fields = bindings.flatMap((binding) => {
    if (typeof binding === 'string') return [binding];
    if (isExplicitBinding(binding) && (!dataType || binding.dataType === dataType)) {
      return [binding.field];
    }
    return [];
  });
  return Array.from(new Set(fields.filter((field) => field !== '')));
}

function findReferences(
  allLayouts: AllLayouts,
  isReference: (component: LayoutComponent) => boolean,
): ComponentReference[] {
  return Object.entries(allLayouts).flatMap(([layoutSetName, layouts]) =>
    Object.entries(layouts).flatMap(([pageName, layout]) =>
      layout.data.layout
        .filter(isReference)
        .map((component) => ({ layoutSetName, pageName, component })),
    ),
  );
}

// A text key is specific enough that any property with exactly that value refers to it, whether a
// text binding, an option or a ["text", key] expression.
function usesText(component: LayoutComponent, textKey: string): boolean {
  const { id: _id, ...properties } = component;
  return containsValue(properties, (value) => value === textKey);
}

// Other layout sets may use another data model, so a field with the same name there is counted too.
// That may keep a field that could have been removed, but never removes one that is in use.
function usesField(component: LayoutComponent, fieldName: string): boolean {
  const bindings: unknown[] = Object.values(component.dataModelBindings ?? {});
  const isBound = bindings.some(
    (binding) =>
      binding === fieldName || (isExplicitBinding(binding) && binding.field === fieldName),
  );
  return isBound || containsValue(component, (value) => isDataModelLookup(value, fieldName));
}

function isDataModelLookup(value: unknown, fieldName: string): boolean {
  return Array.isArray(value) && value[0] === 'dataModel' && value[1] === fieldName;
}

function containsValue(value: unknown, matches: (value: unknown) => boolean): boolean {
  if (matches(value)) return true;
  if (Array.isArray(value)) return value.some((item) => containsValue(item, matches));
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((item) => containsValue(item, matches));
  }
  return false;
}

function isExplicitBinding(binding: unknown): binding is { field: string; dataType?: string } {
  return (
    typeof binding === 'object' &&
    binding !== null &&
    typeof (binding as { field?: unknown }).field === 'string'
  );
}

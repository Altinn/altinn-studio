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
};

export type DeletionCandidates = {
  texts: RemovableItem[];
  fields: RemovableItem[];
};

export type DeletionContext = {
  /** The components that are deleted together, such as a group and its children, or a page's. */
  components: LayoutComponent[];
  /** Text keys that go with them besides the components' own, such as the name of a deleted page. */
  extraTextKeys?: string[];
  layoutSetName: string;
  /** The page the components are on. */
  pageName: string;
  /** The page that is deleted, if it is. Its name is also the key of its title. */
  deletedPageName?: string;
  allLayouts: AllLayouts;
  /** The app's own texts in the edited language. */
  existingTextKeys: string[];
  dataModel?: { dataType: string; schema: JsonSchema };
};

/**
 * Works out what may be removed together with the components, and what should be selected by
 * default: the texts that the builder made for these components and that nothing else uses. Texts
 * with other keys may be used by code lists, the app's code or other texts, which the builder cannot
 * see, so they are kept. Fields are never selected by default, since answers may be stored in them.
 */
export function getDeletionCandidates({
  components,
  extraTextKeys = [],
  layoutSetName,
  pageName,
  deletedPageName,
  allLayouts,
  existingTextKeys,
  dataModel,
}: DeletionContext): DeletionCandidates {
  const deletedIds = new Set(components.map(({ id }) => id));
  const isOtherComponent = (reference: ComponentReference): boolean =>
    !(reference.layoutSetName === layoutSetName && deletedIds.has(reference.component.id));

  const ownTextKeys = unique([...components.flatMap(getOwnTextKeys), ...extraTextKeys]);
  const texts = ownTextKeys
    .filter((textKey) => existingTextKeys.includes(textKey))
    .map((textKey) => {
      const usedBy = findReferences(allLayouts, (other) => usesText(other, textKey)).filter(
        isOtherComponent,
      );
      const isOwnText =
        isBuilderTextKey(textKey, pageName, deletedIds, deletedPageName) &&
        !isTitleOfOtherPage(textKey, allLayouts, layoutSetName, deletedPageName);
      return { name: textKey, usedBy, isSelectedByDefault: usedBy.length === 0 && isOwnText };
    });

  const existingFields = getFieldNames(dataModel?.schema);
  const ownFieldNames = unique(
    components.flatMap((component) => getOwnFieldNames(component, dataModel?.dataType)),
  );
  const fields = ownFieldNames
    .filter((fieldName) => existingFields.includes(fieldName))
    .map((fieldName) => {
      const usedBy = findReferences(allLayouts, (other) => usesField(other, fieldName)).filter(
        isOtherComponent,
      );
      // Answers may be stored in the field wherever the app has run, which the builder cannot know,
      // so the user chooses to remove it.
      return { name: fieldName, usedBy, isSelectedByDefault: false };
    });

  return { texts, fields };
}

/** Something outside the deleted components whose rule checks the answer of one of them. */
export type RuleReference = {
  pageName: string;
  /** Undefined when the rule is on the page itself. */
  component?: LayoutComponent;
};

/**
 * Finds the rules, on components and pages in the layout set, that check a component that is
 * deleted. They are not changed, so the user is told about them.
 */
export function findRuleReferences(
  layouts: PageLayouts,
  deletedIds: Set<string>,
  deletedPageName?: string,
): RuleReference[] {
  const checksDeleted = (value: unknown): boolean =>
    containsValue(
      value,
      (item) => Array.isArray(item) && item[0] === 'component' && deletedIds.has(item[1]),
    );
  return Object.entries(layouts)
    .filter(([pageName]) => pageName !== deletedPageName)
    .flatMap(([pageName, layout]) => {
      const pageRule: RuleReference[] = checksDeleted(layout.data.hidden) ? [{ pageName }] : [];
      const componentRules = layout.data.layout
        .filter((component) => !deletedIds.has(component.id))
        .filter(({ id: _id, ...properties }) => checksDeleted(properties))
        .map((component) => ({ pageName, component }));
      return [...pageRule, ...componentRules];
    });
}

/**
 * Whether the builder made the text for one of the deleted components or for the deleted page. The
 * builder, like ux-editor, names a component's texts `page.componentId.property`, and gives a page's
 * title the page name as key.
 */
function isBuilderTextKey(
  textKey: string,
  pageName: string,
  deletedIds: Set<string>,
  deletedPageName: string | undefined,
): boolean {
  if (deletedPageName && textKey === deletedPageName) return true;
  const prefix = `${pageName}.`;
  if (!textKey.startsWith(prefix)) return false;
  const componentId = textKey.slice(prefix.length, textKey.lastIndexOf('.'));
  return deletedIds.has(componentId);
}

// A page title's key is the page name, so a page with the same name in another layout set shares it.
function isTitleOfOtherPage(
  textKey: string,
  allLayouts: AllLayouts,
  layoutSetName: string,
  deletedPageName: string | undefined,
): boolean {
  return Object.entries(allLayouts).some(
    ([otherLayoutSetName, layouts]) =>
      Object.hasOwn(layouts, textKey) &&
      !(otherLayoutSetName === layoutSetName && textKey === deletedPageName),
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
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

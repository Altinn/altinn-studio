import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, PageLayouts, TextsById } from '../types';

/** The component types that can be added from the app builder. */
export const addableComponentTypes = [
  ComponentType.Heading,
  ComponentType.Paragraph,
  ComponentType.Input,
  ComponentType.TextArea,
  ComponentType.Checkboxes,
] as const;

export type AddableComponentType = (typeof addableComponentTypes)[number];

const dataComponentTypes: AddableComponentType[] = [
  ComponentType.Input,
  ComponentType.TextArea,
  ComponentType.Checkboxes,
];

/** Data components store an answer, so adding one asks for a label and creates a data model field. */
export function isDataComponentType(type: AddableComponentType): boolean {
  return dataComponentTypes.includes(type);
}

export type DataModelBinding = {
  field: string;
  dataType: string;
};

export type NewComponentInput = {
  type: AddableComponentType;
  componentId: string;
  pageName: string;
  /** The text shown as the heading, paragraph or label. */
  text: string;
  /** Texts for the two example options of a checkbox list. */
  optionTexts?: [string, string];
  required?: boolean;
  binding?: DataModelBinding;
};

export type NewComponent = {
  component: LayoutComponent;
  texts: TextsById;
};

/**
 * Creates a component and the texts it uses, with the text keys that ux-editor would give them,
 * so the result looks the same whichever editor made it.
 */
export function createNewComponent({
  type,
  componentId,
  pageName,
  text,
  optionTexts,
  required,
  binding,
}: NewComponentInput): NewComponent {
  const textKey = (name: string): string => `${pageName}.${componentId}.${name}`;
  const titleKey = textKey('title');
  const component: LayoutComponent = {
    id: componentId,
    type,
    textResourceBindings: { title: titleKey },
  };
  const texts: TextsById = { [titleKey]: text };

  if (type === ComponentType.Heading) component.size = 'L';
  if (required) component.required = true;
  if (binding) component.dataModelBindings = { simpleBinding: binding };

  if (type === ComponentType.Checkboxes) {
    const options = (optionTexts ?? ['', '']).map((optionText, index) => {
      const optionKey = textKey(`option${index + 1}`);
      texts[optionKey] = optionText;
      return { value: `${index + 1}`, label: optionKey };
    });
    component.options = options;
  }

  return { component, texts };
}

/** Creates a component ID that is unique among all pages in the layout set. */
export function generateComponentId(type: ComponentType, layouts: PageLayouts): string {
  const existingIds = new Set(
    Object.values(layouts).flatMap((layout) => layout.data.layout.map(({ id }) => id)),
  );
  let componentId: string;
  do {
    componentId = `${type}-${generateRandomId(6)}`;
  } while (existingIds.has(componentId));
  return componentId;
}

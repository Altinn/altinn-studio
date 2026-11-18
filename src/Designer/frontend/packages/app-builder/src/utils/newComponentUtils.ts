import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent, PageLayouts, TextsById } from '../types';
import { YES_NO_CODE_LIST_ID } from './optionUtils';

/** The component types that can be added, in the groups the add box shows them in. */
export const addableComponentGroups = {
  text: [ComponentType.Heading, ComponentType.Paragraph, ComponentType.Alert],
  question: [
    ComponentType.Input,
    ComponentType.TextArea,
    ComponentType.RadioButtons,
    ComponentType.Checkboxes,
    ComponentType.Dropdown,
    ComponentType.Datepicker,
    ComponentType.FileUpload,
  ],
  grouping: [ComponentType.Group],
  // An app without a summary page needs a way to submit, such as a button last on the form.
  action: [ComponentType.Button],
} as const;

export type AddableComponentGroup = keyof typeof addableComponentGroups;

export type AddableComponentType = (typeof addableComponentGroups)[AddableComponentGroup][number];

export type QuestionComponentType = (typeof addableComponentGroups.question)[number];

/** Questions ask for a label before they are added, since the label names their data model field. */
export function isQuestionType(type: ComponentType): type is QuestionComponentType {
  return (addableComponentGroups.question as readonly ComponentType[]).includes(type);
}

/** File uploads save attachments, not an answer in the data model. */
export function savesToDataModel(type: ComponentType): boolean {
  return isQuestionType(type) && type !== ComponentType.FileUpload;
}

export function hasOptions(type: ComponentType): boolean {
  return (
    type === ComponentType.RadioButtons ||
    type === ComponentType.Checkboxes ||
    type === ComponentType.Dropdown
  );
}

/** The data model field a new question saves its answer in. */
export function getSchemaFieldForType(type: ComponentType): JsonSchema {
  return type === ComponentType.Datepicker
    ? { type: 'string', format: 'date' }
    : { type: 'string' };
}

export type DataModelBinding = {
  field: string;
  dataType: string;
};

export type NewComponentInput = {
  type: AddableComponentType;
  componentId: string;
  pageName: string;
  /** The text shown as the heading, paragraph, alert, group title or label. */
  text: string;
  /** Texts for the example options of a checkbox list or dropdown. */
  optionTexts: string[];
  required?: boolean;
  binding?: DataModelBinding;
};

export type NewComponent = {
  component: LayoutComponent;
  texts: TextsById;
};

const defaultMaxFileSizeInMB = 10;

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
  const mainTextProperty = type === ComponentType.Alert ? 'body' : 'title';
  const mainTextKey = textKey(mainTextProperty);
  const texts: TextsById = { [mainTextKey]: text };
  const component: LayoutComponent = {
    id: componentId,
    type,
    textResourceBindings: { [mainTextProperty]: mainTextKey },
    ...getTypeDefaults(type),
  };

  if (required) component.required = true;
  if (binding) component.dataModelBindings = { simpleBinding: binding };

  if (type === ComponentType.Checkboxes || type === ComponentType.Dropdown) {
    component.options = optionTexts.map((optionText, index) => {
      const optionKey = textKey(`option${index + 1}`);
      texts[optionKey] = optionText;
      return { value: `${index + 1}`, label: optionKey };
    });
  }

  return { component, texts };
}

function getTypeDefaults(type: AddableComponentType): Partial<LayoutComponent> {
  switch (type) {
    case ComponentType.Heading:
      return { size: 'L' };
    case ComponentType.Alert:
      return { severity: 'info' };
    case ComponentType.RadioButtons:
      // Yes or no is the most common question in production apps.
      return { optionsId: YES_NO_CODE_LIST_ID };
    case ComponentType.FileUpload:
      return {
        displayMode: 'list',
        maxFileSizeInMB: defaultMaxFileSizeInMB,
        maxNumberOfAttachments: 1,
        minNumberOfAttachments: 0,
      };
    case ComponentType.Group:
      return { children: [] };
    default:
      return {};
  }
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

import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

const commonSpecializedProperties = ['grid'] as const;

const specializedPropertiesByComponent: Partial<Record<ComponentType, readonly string[]>> = {
  [ComponentType.AttachmentList]: ['dataTypeIds'],
  [ComponentType.Checkboxes]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.Dropdown]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.FileUpload]: ['hasCustomFileEndings', 'validFileEndings'],
  [ComponentType.FileUploadWithTag]: [
    'hasCustomFileEndings',
    'mapping',
    'queryParameters',
    'source',
    'validFileEndings',
  ],
  [ComponentType.Likert]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.Map]: ['layers'],
  [ComponentType.MultipleSelect]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.Option]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.RadioButtons]: ['mapping', 'queryParameters', 'source'],
  [ComponentType.RepeatingGroup]: ['children', 'tableColumns'],
  [ComponentType.Subform]: ['layoutSet', 'tableColumns'],
  [ComponentType.Summary2]: ['overrides', 'target'],
  [ComponentType.Text]: ['value'],
  [ComponentType.Accordion]: ['children'],
  [ComponentType.AccordionGroup]: ['children'],
  [ComponentType.ButtonGroup]: ['children'],
  [ComponentType.Group]: ['children'],
  [ComponentType.Image]: ['image.src'],
  [ComponentType.ImageUpload]: ['crop'],
};

export function getSpecializedPropertyPaths(componentType: ComponentType): readonly string[] {
  return [
    ...commonSpecializedProperties,
    ...(specializedPropertiesByComponent[componentType] ?? []),
  ];
}

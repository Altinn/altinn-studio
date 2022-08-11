import { UiSchemaItem, NameInUseProps } from "../types";

export const isValidName = (name: string) => {
  return Boolean(name.match(/^[a-zA-ZæÆøØåÅ][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));
};

export const isNameInUse = ({
  uiSchemaItems,
  parentSchema,
  path,
  name,
}: NameInUseProps) => {
  // Check if the parent node has other children with the same name.
  if (
    parentSchema?.properties?.some(
      (prop) => prop.displayName === name && prop.path !== path,
    )
  ) {
    return true;
  } else if (
    isPathOnPropertiesRoot(path) &&
    uiSchemaItems.some(
      (schemaItem) =>
        schemaItem.displayName === name && schemaItem.path !== path,
    )
  ) {
    return true;
  } else if (
    isPathOnDefinitionsRoot(path) &&
    uiSchemaItems.some(
      (schemaItem) =>
        schemaItem.displayName === name && schemaItem.path !== path,
    )
  ) {
    return true;
  }

  return false;
};

export const isPathOnPropertiesRoot = (path: string) => {
  const noOfMatches: number = (
    (path || '').match(/^#\/properties\/[a-zæøåA-ZÆØÅ0-9]*$/) || []
  ).length;
  return noOfMatches === 1 ? true : false;
};

export const isPathOnDefinitionsRoot = (path: string) => {
  const noOfDefinitionMatches: number = (
    (path || '').match(/^#\/definitions\/[a-zæøåA-ZÆØÅ0-9]*$/) || []
  ).length;
  const noOfDefsMatches: number = (
    (path || '').match(/^#\/\$defs\/[a-zæøåA-ZÆØÅ0-9]*$/) || []
  ).length;
  return noOfDefinitionMatches === 1 || noOfDefsMatches === 1 ? true : false;
};

export const isFieldRequired = (parentItem: UiSchemaItem | null, selectedItem: UiSchemaItem): boolean => {
  return parentItem?.required?.includes(selectedItem?.displayName) ?? false
}

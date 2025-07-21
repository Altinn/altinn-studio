import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import type { IFormLayouts } from '../types/global';
import type { FormComponent } from '../types/FormComponent';

// TODO: Make sure all data model fields are included - what if there are multiple data models? . Issue #10855
export const getDataModelElementNames = (dataModelElements: DataModelFieldElement[]): string[] => {
  return dataModelElements
    ?.filter((element) => element.dataBindingName)
    .map((element) => element.dataBindingName);
};

export const getComponentIds = (formLayouts: IFormLayouts): string[] => {
  // TODO: Make sure all components from the layout set are included, also those inside groups. Issue #10855
  const components = Object.values(formLayouts).flatMap((layout) =>
    Object.values(layout.components),
  );
  // TODO: Make sure there are not duplicate component ids. Related issue: 10857
  return Object.values(components).map((comp: FormComponent) => comp.id);
};

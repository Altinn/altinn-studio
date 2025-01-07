import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutSet, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const excludedComponents = [
  ComponentType.ActionButton,
  ComponentType.Alert,
  ComponentType.AttachmentList,
  ComponentType.Button,
  ComponentType.ButtonGroup,
  ComponentType.CustomButton,
  ComponentType.Grid,
  ComponentType.Header,
  ComponentType.IFrame,
  ComponentType.Image,
  ComponentType.InstantiationButton,
  ComponentType.InstanceInformation,
  ComponentType.Link,
  ComponentType.NavigationBar,
  ComponentType.NavigationButtons,
  ComponentType.Panel,
  ComponentType.Paragraph,
  ComponentType.PrintButton,
  ComponentType.Summary,
  ComponentType.Summary2,
];

type GetComponentOptionsProps = {
  formLayoutsData: IFormLayouts;
  getComponentTitle: (formComponent: FormComponent) => string;
};

type TargetProps = {
  id: string;
  description: string;
};

export const getComponentOptions = ({
  formLayoutsData,
  getComponentTitle,
}: GetComponentOptionsProps): TargetProps[] => {
  const availableComponents = formLayoutsData
    ? Object.values(formLayoutsData).flatMap((layout) =>
        getAllLayoutComponents(layout, excludedComponents),
      )
    : [];

  return availableComponents.map((formComponent: FormComponent) => ({
    id: formComponent.id,
    description: getComponentTitle(formComponent),
  }));
};

export const getPageOptions = (formLayoutsData: IFormLayouts): TargetProps[] => {
  return formLayoutsData
    ? Object.keys(formLayoutsData).map((page) => ({
        id: page,
        description: undefined,
      }))
    : [];
};

export const getLayoutSetOptions = (layoutSets: LayoutSets): LayoutSet[] => {
  return layoutSets?.sets.filter((set: LayoutSet) => set.tasks?.length > 0);
};

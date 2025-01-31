import type { IFormLayouts, IInternalLayout } from '@altinn/ux-editor/types/global';
import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { Summary2TargetConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { LayoutSetsModel } from 'app-shared/types/api/dto/LayoutSetsModel';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';

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

export type TargetPageProps = {
  id: string;
  description: string;
};

export type TargetComponentProps = TargetPageProps & {
  type: ComponentType;
};

type getTargetLayoutSetNameProps = {
  target: Summary2TargetConfig;
  layoutSets: LayoutSetsModel;
  selectedFormLayoutSetName: string;
};

export const getTargetLayoutSetName = ({
  target,
  layoutSets,
  selectedFormLayoutSetName,
}: getTargetLayoutSetNameProps): string => {
  const layoutSetName = target?.taskId
    ? layoutSets.sets.find((layoutSet) => layoutSet.task?.id === target.taskId).id
    : selectedFormLayoutSetName;
  return layoutSetName;
};

type GetComponentOptionsProps = {
  formLayoutsData: IFormLayouts | IInternalLayout[];
  getComponentTitle: (formComponent: FormComponent) => string;
};

export const getComponentOptions = ({
  formLayoutsData,
  getComponentTitle,
}: GetComponentOptionsProps): TargetComponentProps[] => {
  const availableComponents = formLayoutsData
    ? Object.values(formLayoutsData).flatMap((layout) =>
        getAllLayoutComponents(layout, excludedComponents),
      )
    : [];

  return availableComponents.map((formComponent: FormComponent) => ({
    id: formComponent.id,
    description: getComponentTitle(formComponent),
    type: formComponent.type,
  }));
};

export const getPageOptions = (formLayoutsData: IFormLayouts): TargetPageProps[] => {
  return formLayoutsData
    ? Object.keys(formLayoutsData).map((page) => ({
        id: page,
        description: undefined,
      }))
    : [];
};

export const getLayoutSetOptions = (layoutSets: LayoutSetsModel): LayoutSetModel[] => {
  return layoutSets?.sets.filter((set) => set.task);
};

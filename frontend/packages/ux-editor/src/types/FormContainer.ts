import type { IDataModelBindings, ITextResourceBindings } from './global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { ComponentType } from 'app-shared/types/ComponentType';

export interface FormContainer {
  dataModelBindings?: IDataModelBindings;
  id: string;
  index?: number;
  itemType: 'CONTAINER';
  type: ContainerComponent;
  maxCount?: number;
  pageIndex?: number;
  tableHeaders?: string[];
  textResourceBindings?: ITextResourceBindings;
  propertyPath?: string;
  edit?: KeyValuePairs;
  [id: string]: any;
}

export type ContainerComponent =
  | ComponentType.Accordion
  | ComponentType.AccordionGroup
  | ComponentType.ButtonGroup
  | ComponentType.Group;

export const containerComponentsWithValidChildrenMapping: Record<
  ContainerComponent,
  ComponentType[]
> = {
  [ComponentType.Accordion]: [ComponentType.Paragraph],
  [ComponentType.AccordionGroup]: [ComponentType.Accordion],
  [ComponentType.ButtonGroup]: [ComponentType.Button],
  [ComponentType.Group]: Object.values(ComponentType),
};

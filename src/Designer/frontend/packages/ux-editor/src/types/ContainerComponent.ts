import type { ComponentType } from 'app-shared/types/ComponentType';

export type ContainerComponentType =
  | ComponentType.Accordion
  | ComponentType.AccordionGroup
  | ComponentType.ButtonGroup
  | ComponentType.Group
  | ComponentType.RepeatingGroup;

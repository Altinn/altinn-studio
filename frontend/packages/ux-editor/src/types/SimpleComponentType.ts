import type { ComponentType } from 'app-shared/types/ComponentType';

export type SimpleComponentType = Exclude<
  ComponentType,
  [
    ComponentType.Accordion,
    ComponentType.AccordionGroup,
    ComponentType.ButtonGroup,
    ComponentType.Group,
  ]
>;

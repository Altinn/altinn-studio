import { type ComponentType } from '../enum/ComponentType';

export interface DragAndDropComponents {
  componentToDrag: ComponentType;
  componentToDropOn: ComponentType;
}

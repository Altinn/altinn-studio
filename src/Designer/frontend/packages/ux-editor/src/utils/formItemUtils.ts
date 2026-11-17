import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import { isContainerComponentType } from '../data/containerComponentTypes';

export const isContainer = (item: FormComponent | FormContainer): item is FormContainer =>
  isContainerComponentType(item.type);

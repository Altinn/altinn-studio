import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';

export const isContainer = (item: FormComponent | FormContainer): item is FormContainer =>
  item.itemType === 'CONTAINER';

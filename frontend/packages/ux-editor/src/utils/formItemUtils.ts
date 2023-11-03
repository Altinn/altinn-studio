import { FormComponent } from '../types/FormComponent';
import { FormContainer } from '../types/FormContainer';

export const isContainer = (item: FormComponent | FormContainer) => item.itemType === 'CONTAINER';

import { FormComponent } from './FormComponent';
import { ContainerComponent, FormContainer } from './FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';

// Add additional group-components here?
export type FormItem<T extends ComponentType = ComponentType> = T extends ContainerComponent
    ? FormContainer 
    : FormComponent<T>;

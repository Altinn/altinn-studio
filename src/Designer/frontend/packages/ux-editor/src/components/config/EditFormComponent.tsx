import { ComponentSpecificContent } from './componentSpecificContent';
import { FormComponentConfig } from './FormComponentConfig';
import type { FormItem } from '../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { StudioFieldset } from '@studio/components';
import { getComponentDefinition } from '../../data/componentCatalog';

export interface IEditFormComponentProps<T extends ComponentType = ComponentType> {
  editFormId: string;
  component: FormItem<T>;
  handleComponentUpdate: (component: FormItem<T>, mutateOptions?: UpdateFormMutateOptions) => void;
}

export const EditFormComponent = ({
  editFormId,
  component,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const properties = getComponentDefinition(component.type)?.properties ?? {};
  return (
    <StudioFieldset hideLegend>
      <FormComponentConfig
        properties={properties}
        component={component}
        editFormId={editFormId}
        handleComponentUpdate={handleComponentUpdate}
      />
      <ComponentSpecificContent
        component={component}
        handleComponentChange={handleComponentUpdate}
      />
    </StudioFieldset>
  );
};

import { ComponentSpecificContent } from './componentSpecificContent';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { FormComponentConfig } from './FormComponentConfig';
import type { FormItem } from '../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { StudioFieldset } from '@studio/components';

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
  const { data: schema } = useComponentSchemaQuery(component.type);
  return (
    <StudioFieldset hideLegend>
      <FormComponentConfig
        schema={schema}
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

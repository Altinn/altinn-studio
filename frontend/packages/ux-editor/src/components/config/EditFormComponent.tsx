import React from 'react';
import { ComponentSpecificContent } from './componentSpecificContent';
import { Fieldset } from '@digdir/designsystemet-react';
import classes from './EditFormComponent.module.css';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { FormComponentConfig } from './FormComponentConfig';
import type { FormItem } from '../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';

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
    <Fieldset className={classes.root} legend='' size='sm'>
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
    </Fieldset>
  );
};

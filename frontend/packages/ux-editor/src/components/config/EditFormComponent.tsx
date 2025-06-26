import React from 'react';
import { ComponentSpecificContent } from './componentSpecificContent';
import { Fieldset } from '@digdir/designsystemet-react';
import classes from './EditFormComponent.module.css';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components-legacy';
import { FormComponentConfig } from './FormComponentConfig';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { data: schema, isPending } = useComponentSchemaQuery(component.type);

  return (
    <Fieldset className={classes.root} legend='' size='sm'>
      {isPending && (
        <StudioSpinner
          showSpinnerTitle
          spinnerTitle={t('ux_editor.edit_component.loading_schema')}
        />
      )}
      {!isPending && (
        <FormComponentConfig
          schema={schema}
          component={component}
          editFormId={editFormId}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}
      <ComponentSpecificContent
        component={component}
        handleComponentChange={handleComponentUpdate}
      />
    </Fieldset>
  );
};
